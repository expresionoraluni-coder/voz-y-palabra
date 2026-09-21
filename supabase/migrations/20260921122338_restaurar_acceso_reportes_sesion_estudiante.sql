-- El identificador de una sesión anónima de estudiante puede renovarse al
-- volver a ingresar. El historial pertenece a la fila estable de estudiante,
-- no a un identificador efímero de Auth.

drop policy if exists "reportes visibles para reportante o administrador" on public.reportes;
create policy "reportes visibles para reportante o administrador" on public.reportes
  for select to authenticated using (
    reportante_id = (select auth.uid())
    or (reportante_tipo = 'estudiante' and estudiante_id = public.estudiante_actual())
    or (reportante_tipo = 'docente' and docente_id = (select auth.uid()) and public.es_docente_activo())
    or public.es_administrador_activo()
  );

drop policy if exists "reportante o admin lee mensajes del reporte" on public.reporte_mensajes;
create policy "reportante o admin lee mensajes del reporte" on public.reporte_mensajes
  for select to authenticated using (
    public.es_administrador_activo() or (
      visible_para_reportante and exists (
        select 1 from public.reportes r
        where r.id = reporte_mensajes.reporte_id and (
          r.reportante_id = (select auth.uid())
          or (r.reportante_tipo = 'estudiante' and r.estudiante_id = public.estudiante_actual())
          or (r.reportante_tipo = 'docente' and r.docente_id = (select auth.uid()) and public.es_docente_activo())
        )
      )
    )
  );

drop policy if exists "participante agrega mensaje al reporte" on public.reporte_mensajes;
create policy "participante agrega mensaje al reporte" on public.reporte_mensajes
  for insert to authenticated with check (
    (autor_tipo = 'reportante' and autor_id = (select auth.uid()) and visible_para_reportante and exists (
      select 1 from public.reportes r
      where r.id = reporte_mensajes.reporte_id and r.estado <> 'cerrado' and (
        r.reportante_id = (select auth.uid())
        or (r.reportante_tipo = 'estudiante' and r.estudiante_id = public.estudiante_actual())
        or (r.reportante_tipo = 'docente' and r.docente_id = (select auth.uid()) and public.es_docente_activo())
      )
    ))
    or (autor_tipo = 'administrador' and autor_id = (select auth.uid()) and public.es_administrador_activo())
  );

create or replace function public.es_reportante_actual_de_reporte(p_reporte_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.reportes r
    where r.id = p_reporte_id and (
      r.reportante_id = (select auth.uid())
      or (r.reportante_tipo = 'estudiante' and r.estudiante_id = public.estudiante_actual())
      or (r.reportante_tipo = 'docente' and r.docente_id = (select auth.uid()) and public.es_docente_activo())
    )
  );
$$;
revoke all on function public.es_reportante_actual_de_reporte(uuid) from public, anon;
grant execute on function public.es_reportante_actual_de_reporte(uuid) to authenticated;

create or replace function public.registrar_mensaje_reporte(p_reporte_id uuid, p_mensaje text)
returns table(id uuid) language plpgsql security invoker set search_path = public
as $$
declare
  v_estado text;
  v_admin boolean := public.es_administrador_activo();
  v_tipo text;
begin
  if auth.uid() is null then raise exception 'Sesión inválida.'; end if;
  if p_mensaje is null or length(trim(p_mensaje)) not between 2 and 2000 then raise exception 'El mensaje debe tener entre 2 y 2000 caracteres.'; end if;
  if not (v_admin or public.es_reportante_actual_de_reporte(p_reporte_id)) then raise exception 'No encontramos este reporte.'; end if;
  select r.estado into v_estado from public.reportes r where r.id = p_reporte_id;
  if v_estado = 'cerrado' then raise exception 'Este reporte ya está cerrado.'; end if;
  v_tipo := case when v_admin then 'administrador' else 'reportante' end;
  return query insert into public.reporte_mensajes (reporte_id, autor_id, autor_tipo, mensaje, visible_para_reportante)
    values (p_reporte_id, (select auth.uid()), v_tipo, trim(p_mensaje), true)
    returning reporte_mensajes.id;
end;
$$;
revoke execute on function public.registrar_mensaje_reporte(uuid, text) from public, anon;
grant execute on function public.registrar_mensaje_reporte(uuid, text) to authenticated;

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
  )) >= 10 then
    raise exception 'Alcanzaste el límite diario de solicitudes. Revisa tus reportes abiertos antes de crear otro.';
  end if;
  select r.id into v_existente from public.reportes r where r.categoria = p_categoria and coalesce(r.ruta, '') = coalesce(p_ruta, '') and r.estado in ('recibido', 'en_revision', 'necesita_informacion') and r.created_at >= now() - interval '24 hours' and (
    (p_reportante_tipo = 'estudiante' and r.reportante_tipo = 'estudiante' and r.estudiante_id = p_estudiante_id)
    or (p_reportante_tipo = 'docente' and r.reportante_id = (select auth.uid()))
  ) order by r.created_at desc limit 1;
  if v_existente is not null then return query select v_existente, true; return; end if;
  v_prioridad := case
    when p_categoria in ('estudiante_acceso', 'estudiante_avance', 'docente_acceso', 'acceso', 'avance') then 'alta'
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

create or replace function public.proteger_cuota_reportes()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null then
    perform pg_advisory_xact_lock(hashtext(case when new.reportante_tipo = 'estudiante' then 'estudiante:' || new.estudiante_id::text else 'docente:' || (select auth.uid())::text end));
    if (select count(*) from public.reportes r where r.created_at >= now() - interval '24 hours' and (
      (new.reportante_tipo = 'estudiante' and r.reportante_tipo = 'estudiante' and r.estudiante_id = new.estudiante_id)
      or (new.reportante_tipo = 'docente' and r.reportante_id = (select auth.uid()))
    )) >= 10 then
      raise exception 'Alcanzaste el límite diario de solicitudes. Revisa tus reportes abiertos antes de crear otro.';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.proteger_cuota_reportes() from public, anon, authenticated;
