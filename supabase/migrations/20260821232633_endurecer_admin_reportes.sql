-- Endurece la administración y la atención de reportes.
-- La provisión de administradores vive en public.administradores; el correo
-- no es una lista de permisos paralela.

create or replace function public.es_administrador_activo()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
      from public.administradores a
      join auth.users u on u.id = a.id
     where a.id = (select auth.uid())
       and a.activo = true
       and u.email_confirmed_at is not null
       and exists (
         select 1 from auth.mfa_factors factor
          where factor.user_id = (select auth.uid())
            and factor.factor_type = 'totp'
            and factor.status = 'verified'
       )
       and coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
  );
$$;

revoke all on function public.es_administrador_activo() from public, anon;
grant execute on function public.es_administrador_activo() to authenticated;

create or replace function public.crear_perfil_docente(p_nombre text, p_codigo_invitacion text)
returns text language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_hash text;
  v_correo text;
  v_intentos record;
  v_max_intentos constant int := 5;
  v_minutos_bloqueo constant int := 15;
  v_email_confirmado timestamptz;
begin
  if auth.uid() is null then raise exception 'Sesión inválida, intenta de nuevo'; end if;
  if coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true' then
    raise exception 'Se requiere una cuenta docente confirmada.';
  end if;
  select email, email_confirmed_at into v_correo, v_email_confirmado from auth.users where id = auth.uid();
  if exists (select 1 from public.administradores a where a.id = auth.uid()) then
    raise exception 'Esta cuenta tiene acceso administrativo y no se puede registrar como docente.';
  end if;
  if v_email_confirmado is null then raise exception 'Confirma tu correo antes de continuar.'; end if;
  select * into v_intentos from public.intentos_codigo_invitacion where usuario_id = auth.uid();
  if v_intentos.bloqueado_hasta is not null and v_intentos.bloqueado_hasta > now() then
    return format('Demasiados intentos. Espera %s minutos e intenta de nuevo.', greatest(1, ceil(extract(epoch from (v_intentos.bloqueado_hasta - now())) / 60)));
  end if;
  select valor into v_hash from public.configuracion_plataforma where clave = 'codigo_invitacion_docente_hash';
  if v_hash is null or extensions.crypt(coalesce(trim(p_codigo_invitacion), ''), v_hash) <> v_hash then
    insert into public.intentos_codigo_invitacion (usuario_id, intentos, bloqueado_hasta)
    values (auth.uid(), 1, null)
    on conflict (usuario_id) do update set
      intentos = public.intentos_codigo_invitacion.intentos + 1,
      bloqueado_hasta = case
        when public.intentos_codigo_invitacion.intentos + 1 >= v_max_intentos
          then now() + (v_minutos_bloqueo || ' minutes')::interval
        else public.intentos_codigo_invitacion.bloqueado_hasta
      end;
    perform pg_sleep(0.5);
    return 'El código de invitación no es correcto.';
  end if;
  delete from public.intentos_codigo_invitacion where usuario_id = auth.uid();
  if p_nombre is null or length(trim(p_nombre)) = 0 or length(p_nombre) > 200 then raise exception 'Escribe tu nombre.'; end if;
  insert into public.docentes (id, nombre, correo) values (auth.uid(), trim(p_nombre), v_correo) on conflict (id) do nothing;
  return null;
end;
$$;

revoke execute on function public.crear_perfil_docente(text, text) from public, anon;
grant execute on function public.crear_perfil_docente(text, text) to authenticated;

create or replace function public.registrar_reporte(
  p_reportante_tipo text, p_estudiante_id uuid, p_docente_id uuid,
  p_grupo_id uuid, p_unidad_id uuid, p_actividad_id uuid,
  p_categoria text, p_descripcion text, p_ruta text, p_contexto jsonb
)
returns table(id uuid, duplicado boolean)
language plpgsql security definer set search_path = public
as $$
declare
  v_existente uuid;
  v_prioridad text;
  v_unidad_id uuid := p_unidad_id;
  v_contexto jsonb := coalesce(p_contexto, '{}'::jsonb);
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
    if not exists (select 1 from public.docentes d where d.id = (select auth.uid())) then raise exception 'No encontramos tu perfil docente.'; end if;
    if p_grupo_id is not null and not exists (select 1 from public.grupos g where g.id = p_grupo_id and g.docente_id = (select auth.uid())) then raise exception 'No tienes permiso para reportar ese grupo.'; end if;
  end if;

  -- Evita que dos solicitudes simultáneas del mismo usuario creen duplicados.
  perform pg_advisory_xact_lock(hashtextextended(format('%s|%s|%s', auth.uid(), p_categoria, coalesce(p_ruta, '')), 0));
  select r.id into v_existente from public.reportes r
   where r.reportante_id = (select auth.uid())
     and r.categoria = p_categoria
     and coalesce(r.ruta, '') = coalesce(p_ruta, '')
     and r.estado in ('recibido', 'en_revision', 'necesita_informacion')
     and r.created_at >= now() - interval '24 hours'
   order by r.created_at desc limit 1;
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

create or replace function public.proteger_reporte_atencion()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.id is distinct from old.id
    or new.reportante_id is distinct from old.reportante_id
    or new.reportante_tipo is distinct from old.reportante_tipo
    or new.estudiante_id is distinct from old.estudiante_id
    or new.docente_id is distinct from old.docente_id
    or new.grupo_id is distinct from old.grupo_id
    or new.unidad_id is distinct from old.unidad_id
    or new.actividad_id is distinct from old.actividad_id
    or new.categoria is distinct from old.categoria
    or new.descripcion is distinct from old.descripcion
    or new.ruta is distinct from old.ruta
    or new.contexto is distinct from old.contexto
    or new.created_at is distinct from old.created_at then
    raise exception 'Los datos originales del reporte no se pueden modificar.';
  end if;
  if auth.uid() is not null and not public.es_administrador_activo() then raise exception 'No tienes permiso para atender reportes.'; end if;
  if auth.uid() is not null and new.atendido_por is not null and new.atendido_por <> (select auth.uid()) then raise exception 'El reporte debe quedar atendido por la cuenta administrativa activa.'; end if;
  if new.estado in ('resuelto', 'cerrado') and nullif(trim(new.resolucion), '') is null then raise exception 'Una atención resuelta o cerrada necesita una nota.'; end if;
  if auth.uid() is not null then new.atendido_por := (select auth.uid()); end if;
  if new.estado in ('resuelto', 'cerrado') and old.estado not in ('resuelto', 'cerrado') then new.atendido_en := clock_timestamp();
  elsif new.estado not in ('resuelto', 'cerrado') then new.atendido_en := null;
  else new.atendido_en := old.atendido_en;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists trg_proteger_reporte_atencion on public.reportes;
create trigger trg_proteger_reporte_atencion before update on public.reportes for each row execute function public.proteger_reporte_atencion();
revoke execute on function public.proteger_reporte_atencion() from public, anon, authenticated;

create table if not exists public.reporte_eventos (
  id uuid primary key default gen_random_uuid(),
  reporte_id uuid not null references public.reportes(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_nombre text not null default 'Sistema' check (length(trim(actor_nombre)) between 1 and 200),
  tipo_evento text not null default 'actualizacion_atencion' check (tipo_evento = 'actualizacion_atencion'),
  estado_anterior text,
  estado_nuevo text,
  prioridad_anterior text,
  prioridad_nueva text,
  resolucion_anterior text,
  resolucion_nueva text,
  creado_en timestamptz not null default now()
);

create index if not exists reporte_eventos_reporte_id_idx on public.reporte_eventos(reporte_id, creado_en desc);
alter table public.reporte_eventos enable row level security;
revoke all on public.reporte_eventos from public, anon, authenticated;
grant select on public.reporte_eventos to authenticated;
grant all on public.reporte_eventos to service_role;

create or replace function public.registrar_evento_reporte_atencion()
returns trigger language plpgsql security definer set search_path = public, auth
as $$
begin
  insert into public.reporte_eventos (
    reporte_id, actor_id, actor_nombre, estado_anterior, estado_nuevo,
    prioridad_anterior, prioridad_nueva, resolucion_anterior, resolucion_nueva
  ) values (
    new.id,
    (select auth.uid()),
    coalesce((select a.nombre from public.administradores a where a.id = (select auth.uid())), 'Sistema'),
    old.estado, new.estado, old.prioridad, new.prioridad, old.resolucion, new.resolucion
  );
  return new;
end;
$$;

drop trigger if exists trg_registrar_evento_reporte_atencion on public.reportes;
create trigger trg_registrar_evento_reporte_atencion after update on public.reportes for each row execute function public.registrar_evento_reporte_atencion();
revoke execute on function public.registrar_evento_reporte_atencion() from public, anon, authenticated;

drop policy if exists "administrador consulta historial de reportes" on public.reporte_eventos;
create policy "administrador consulta historial de reportes" on public.reporte_eventos
  for select to authenticated using (public.es_administrador_activo());

revoke update on public.reportes from authenticated;
grant update (estado, prioridad, resolucion) on public.reportes to authenticated;

