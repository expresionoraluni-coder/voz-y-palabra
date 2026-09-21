-- El reporte sigue perteneciendo a la persona que lo creó, pero la lectura
-- de una respuesta nueva necesita un dato separado de la atención admin.
-- Así no se alteran el estado, la auditoría ni la fecha de actualización.
alter table public.reportes
  add column if not exists reportante_ultimo_visto_en timestamptz not null default now();

-- La tabla ya usa privilegios por columna. Se agregan solo los dos campos
-- que la interfaz de seguimiento necesita mostrar o confirmar como leídos.
grant select (fecha_limite, reportante_ultimo_visto_en)
  on public.reportes to authenticated;
grant update (reportante_ultimo_visto_en)
  on public.reportes to authenticated;

drop policy if exists "reportante confirma lectura del reporte" on public.reportes;
create policy "reportante confirma lectura del reporte" on public.reportes
  for update to authenticated
  using (private.es_reportante_actual_de_reporte(id))
  with check (private.es_reportante_actual_de_reporte(id));

-- Un reportante solo puede cambiar su propio acuse de lectura. Se normaliza
-- al reloj del servidor para impedir fechas manipuladas desde el navegador.
create or replace function public.proteger_reporte_atencion()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null
    and not public.es_administrador_activo()
    and private.es_reportante_actual_de_reporte(old.id)
    and new.reportante_ultimo_visto_en is distinct from old.reportante_ultimo_visto_en
    and (to_jsonb(new) - 'reportante_ultimo_visto_en') is not distinct from (to_jsonb(old) - 'reportante_ultimo_visto_en') then
    new.reportante_ultimo_visto_en := clock_timestamp();
    return new;
  end if;

  if new.id is distinct from old.id or new.reportante_id is distinct from old.reportante_id or new.reportante_tipo is distinct from old.reportante_tipo
    or new.estudiante_id is distinct from old.estudiante_id or new.docente_id is distinct from old.docente_id or new.grupo_id is distinct from old.grupo_id
    or new.unidad_id is distinct from old.unidad_id or new.actividad_id is distinct from old.actividad_id or new.categoria is distinct from old.categoria
    or new.descripcion is distinct from old.descripcion or new.ruta is distinct from old.ruta or new.contexto is distinct from old.contexto
    or new.created_at is distinct from old.created_at then raise exception 'Los datos originales del reporte no se pueden modificar.'; end if;
  if auth.uid() is not null and not public.es_administrador_activo() then raise exception 'No tienes permiso para atender reportes.'; end if;
  if new.asignado_a is not null and not exists (select 1 from public.administradores a where a.id = new.asignado_a and a.activo) then raise exception 'La cuenta asignada no es un administrador activo.'; end if;
  if auth.uid() is not null and new.atendido_por is not null and new.atendido_por <> (select auth.uid()) then raise exception 'El reporte debe quedar atendido por la cuenta administrativa activa.'; end if;
  if new.estado is distinct from old.estado and not (
    (old.estado = 'recibido' and new.estado in ('en_revision', 'necesita_informacion', 'resuelto', 'cerrado'))
    or (old.estado = 'en_revision' and new.estado in ('necesita_informacion', 'resuelto', 'cerrado'))
    or (old.estado = 'necesita_informacion' and new.estado in ('en_revision', 'resuelto', 'cerrado'))
    or (old.estado = 'resuelto' and new.estado in ('en_revision', 'cerrado'))
    or (old.estado = 'cerrado' and new.estado = 'en_revision')
  ) then raise exception 'La transición del reporte no es válida.'; end if;
  if new.estado is not distinct from old.estado and new.prioridad is not distinct from old.prioridad
    and new.resolucion is not distinct from old.resolucion and new.respuesta_publica is not distinct from old.respuesta_publica
    and new.asignado_a is not distinct from old.asignado_a and new.fecha_limite is not distinct from old.fecha_limite then return new; end if;
  if new.asignado_a is distinct from old.asignado_a then new.asignado_en := case when new.asignado_a is null then null else clock_timestamp() end; else new.asignado_en := old.asignado_en; end if;
  if auth.uid() is not null then new.atendido_por := (select auth.uid()); end if;
  if new.estado in ('resuelto', 'cerrado') and old.estado not in ('resuelto', 'cerrado') then new.atendido_en := clock_timestamp(); elsif new.estado not in ('resuelto', 'cerrado') then new.atendido_en := null; else new.atendido_en := old.atendido_en; end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke execute on function public.proteger_reporte_atencion() from public, anon, authenticated;

-- El impacto declarado ordena el primer vistazo: no cambia permisos ni
-- resuelve el caso automáticamente. Administración conserva la prioridad.
create or replace function public.registrar_reporte(
  p_reportante_tipo text, p_estudiante_id uuid, p_docente_id uuid,
  p_grupo_id uuid, p_unidad_id uuid, p_actividad_id uuid,
  p_categoria text, p_descripcion text, p_ruta text, p_contexto jsonb
)
returns table(id uuid, duplicado boolean)
language plpgsql security definer set search_path = public
as $$
declare v_existente uuid; v_prioridad text; v_unidad_id uuid := p_unidad_id; v_contexto jsonb := coalesce(p_contexto, '{}'::jsonb);
begin
  if auth.uid() is null then raise exception 'Sesión inválida, intenta de nuevo.'; end if;
  if p_reportante_tipo not in ('estudiante', 'docente') then raise exception 'El tipo de reporte no es válido.'; end if;
  if p_categoria not in (
    'estudiante_acceso', 'estudiante_actividad', 'estudiante_avance', 'estudiante_instruccion',
    'estudiante_video', 'estudiante_tecnico', 'estudiante_contenido', 'estudiante_otro',
    'docente_acceso', 'docente_grupo', 'docente_estudiantes', 'docente_actividad',
    'docente_seguimiento', 'docente_video', 'docente_tecnico', 'docente_otro',
    'acceso', 'actividad', 'avance', 'video', 'carga', 'contenido', 'orientacion', 'otro'
  ) then raise exception 'La categoría no es válida.'; end if;
  if p_descripcion is null or length(trim(p_descripcion)) not between 10 and 2000 then raise exception 'La descripción debe tener entre 10 y 2000 caracteres.'; end if;
  if p_ruta is not null and length(p_ruta) > 300 then raise exception 'La pantalla indicada no es válida.'; end if;
  if jsonb_typeof(v_contexto) <> 'object' or length(v_contexto::text) > 4000 then raise exception 'El contexto del reporte no es válido.'; end if;
  if p_unidad_id is not null and not exists (select 1 from public.unidades u where u.id = p_unidad_id) then raise exception 'La unidad del reporte no es válida.'; end if;
  if p_actividad_id is not null then
    select a.unidad_id into v_unidad_id from public.actividades a where a.id = p_actividad_id and (p_unidad_id is null or a.unidad_id = p_unidad_id);
    if v_unidad_id is null then raise exception 'La actividad del reporte no es válida.'; end if;
    v_contexto := jsonb_set(v_contexto, '{unidad_id}', to_jsonb(v_unidad_id::text), true);
  end if;
  if p_reportante_tipo = 'estudiante' then
    if p_categoria not in ('estudiante_acceso', 'estudiante_actividad', 'estudiante_avance', 'estudiante_instruccion', 'estudiante_video', 'estudiante_tecnico', 'estudiante_contenido', 'estudiante_otro') then raise exception 'La categoría no corresponde a una solicitud de estudiante.'; end if;
    if p_estudiante_id is null or p_docente_id is not null then raise exception 'El reporte de estudiante no es válido.'; end if;
    if not exists (select 1 from public.estudiantes e where e.id = p_estudiante_id and e.auth_user_id = (select auth.uid()) and e.activo = true and (p_grupo_id is null or p_grupo_id = e.grupo_id)) then raise exception 'No tienes permiso para reportar ese contexto.'; end if;
  else
    if p_categoria not in ('docente_acceso', 'docente_grupo', 'docente_estudiantes', 'docente_actividad', 'docente_seguimiento', 'docente_video', 'docente_tecnico', 'docente_otro') then raise exception 'La categoría no corresponde a una solicitud de docente.'; end if;
    if p_docente_id is null or p_estudiante_id is not null or p_docente_id <> (select auth.uid()) then raise exception 'El reporte de docente no es válido.'; end if;
    if not public.es_docente_activo() then raise exception 'No encontramos tu perfil docente.'; end if;
    if p_grupo_id is not null and not exists (select 1 from public.grupos g where g.id = p_grupo_id and g.docente_id = (select auth.uid())) then raise exception 'No tienes permiso para reportar ese grupo.'; end if;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(format('%s|%s|%s', auth.uid(), p_categoria, coalesce(p_ruta, '')), 0));
  perform pg_advisory_xact_lock(hashtext(case when p_reportante_tipo = 'estudiante' then 'estudiante:' || p_estudiante_id::text else 'docente:' || (select auth.uid())::text end));
  if (select count(*) from public.reportes r where r.created_at >= now() - interval '24 hours' and (
    (p_reportante_tipo = 'estudiante' and r.reportante_tipo = 'estudiante' and r.estudiante_id = p_estudiante_id)
    or (p_reportante_tipo = 'docente' and r.reportante_id = (select auth.uid()))
  )) >= 10 then raise exception 'Alcanzaste el límite diario de solicitudes. Revisa tus reportes abiertos antes de crear otro.'; end if;
  select r.id into v_existente from public.reportes r where r.categoria = p_categoria and coalesce(r.ruta, '') = coalesce(p_ruta, '') and r.estado in ('recibido', 'en_revision', 'necesita_informacion') and r.created_at >= now() - interval '24 hours' and (
    (p_reportante_tipo = 'estudiante' and r.reportante_tipo = 'estudiante' and r.estudiante_id = p_estudiante_id)
    or (p_reportante_tipo = 'docente' and r.reportante_id = (select auth.uid()))
  ) order by r.created_at desc limit 1;
  if v_existente is not null then return query select v_existente, true; return; end if;
  v_prioridad := case
    when p_categoria in ('estudiante_acceso', 'estudiante_avance', 'docente_acceso', 'acceso', 'avance') then 'alta'
    when p_reportante_tipo = 'estudiante' and v_contexto ->> 'impacto' = 'no_puedo_continuar'
      and p_categoria in ('estudiante_actividad', 'estudiante_video', 'estudiante_tecnico') then 'alta'
    when p_categoria in ('estudiante_instruccion', 'orientacion') then 'baja'
    else 'normal'
  end;
  insert into public.reportes (reportante_id, reportante_tipo, estudiante_id, docente_id, grupo_id, unidad_id, actividad_id, categoria, descripcion, prioridad, ruta, contexto)
  values ((select auth.uid()), p_reportante_tipo, p_estudiante_id, p_docente_id, p_grupo_id, v_unidad_id, p_actividad_id, p_categoria, trim(p_descripcion), v_prioridad, p_ruta, v_contexto)
  returning public.reportes.id into v_existente;
  return query select v_existente, false;
end;
$$;
revoke execute on function public.registrar_reporte(text, uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb) from public, anon;
grant execute on function public.registrar_reporte(text, uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb) to authenticated;
