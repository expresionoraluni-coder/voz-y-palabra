-- Endurecimiento coordinado de perfiles docente/administrador e ingresos.
-- No cambia la política de contenido global entre docentes: esa excepción fue
-- solicitada y se conserva explícitamente.

alter table public.intentos_nombre_estudiante
  add column if not exists actualizado_en timestamptz not null default now();

drop function if exists public.controlar_rate_limit_ingreso();
drop table if exists private.ingreso_rate_limits;
create table if not exists private.ingreso_rate_limits_claves (
  clave text primary key,
  ventana_inicio timestamptz not null default now(),
  intentos int not null default 0 check (intentos >= 0),
  actualizado_en timestamptz not null default now()
);
create index if not exists ingreso_rate_limits_claves_actualizado_idx on private.ingreso_rate_limits_claves(actualizado_en);
create table if not exists private.invitacion_rate_limits (
  clave text primary key,
  ventana_inicio timestamptz not null default now(),
  intentos int not null default 0 check (intentos >= 0),
  actualizado_en timestamptz not null default now()
);
create table if not exists private.password_recovery_rate_limits (
  clave text primary key,
  ventana_inicio timestamptz not null default now(),
  intentos int not null default 0 check (intentos >= 0),
  actualizado_en timestamptz not null default now()
);
revoke all on private.ingreso_rate_limits_claves, private.invitacion_rate_limits, private.password_recovery_rate_limits from public, anon, authenticated;
grant all on private.ingreso_rate_limits_claves, private.invitacion_rate_limits, private.password_recovery_rate_limits to service_role;

create or replace function private.controlar_rate_limit_ingreso()
returns void
language plpgsql security definer set search_path = private, pg_catalog
as $$
declare
  v_path text := current_setting('request.path', true);
  v_method text := current_setting('request.method', true);
  v_headers jsonb := '{}'::jsonb;
  v_subject text := nullif(current_setting('request.jwt.claim.sub', true), '');
  v_ip_text text;
  v_clave text;
  v_intentos int;
begin
  if v_method <> 'POST' or v_path is null
     or (v_path not like '%/rpc/ingresar_estudiante'
         and v_path not like '%/rpc/crear_perfil_docente') then
    return;
  end if;
  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  exception when others then
    v_headers := '{}'::jsonb;
  end;
  v_ip_text := btrim(coalesce(v_headers ->> 'cf-connecting-ip', v_headers ->> 'x-nf-client-connection-ip', ''));
  v_clave := case
    when v_subject ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then 'usuario:' || v_subject
    when v_ip_text <> '' then 'red:' || v_ip_text
    else null
  end;
  if v_clave is null then
    raise sqlstate 'PGRST' using
      message = json_build_object('code', 'INGRESO_RATE_LIMIT', 'message', 'No pudimos validar el origen de la solicitud.')::text,
      detail = json_build_object('status', 429, 'status_text', 'Too Many Requests')::text;
  end if;
  delete from private.ingreso_rate_limits_claves where actualizado_en < now() - interval '1 day';
  insert into private.ingreso_rate_limits_claves (clave, ventana_inicio, intentos, actualizado_en)
  values (v_clave, now(), 1, now())
  on conflict (clave) do update set
    intentos = case when private.ingreso_rate_limits_claves.actualizado_en < now() - interval '5 minutes' then 1 else private.ingreso_rate_limits_claves.intentos + 1 end,
    ventana_inicio = case when private.ingreso_rate_limits_claves.actualizado_en < now() - interval '5 minutes' then now() else private.ingreso_rate_limits_claves.ventana_inicio end,
    actualizado_en = now()
  returning intentos into v_intentos;
  if v_intentos > 30 then
    raise sqlstate 'PGRST' using
      message = json_build_object('code', 'INGRESO_RATE_LIMIT', 'message', 'Demasiadas solicitudes de ingreso. Intenta de nuevo en unos minutos.')::text,
      detail = json_build_object('status', 429, 'status_text', 'Too Many Requests')::text;
  end if;
end;
$$;
revoke all on function private.controlar_rate_limit_ingreso() from public, anon, authenticated;
grant execute on function private.controlar_rate_limit_ingreso() to authenticator;
alter role authenticator set pgrst.db_pre_request = 'private.controlar_rate_limit_ingreso';
notify pgrst, 'reload config';

create or replace function public.validar_codigo_invitacion(p_codigo text)
returns boolean
language plpgsql security definer set search_path = public, extensions, private, pg_catalog
as $$
declare v_headers jsonb := '{}'::jsonb; v_origen text; v_intentos int; v_hash text;
begin
  if p_codigo is null or length(trim(p_codigo)) not between 4 and 64 then return false; end if;
  begin v_headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb; exception when others then v_headers := '{}'::jsonb; end;
  v_origen := btrim(coalesce(v_headers ->> 'cf-connecting-ip', v_headers ->> 'x-nf-client-connection-ip', ''));
  if v_origen = '' then return false; end if;
  delete from private.invitacion_rate_limits where actualizado_en < now() - interval '1 day';
  insert into private.invitacion_rate_limits (clave, ventana_inicio, intentos, actualizado_en)
  values (v_origen, now(), 1, now())
  on conflict (clave) do update set
    intentos = case when private.invitacion_rate_limits.actualizado_en < now() - interval '15 minutes' then 1 else private.invitacion_rate_limits.intentos + 1 end,
    ventana_inicio = case when private.invitacion_rate_limits.actualizado_en < now() - interval '15 minutes' then now() else private.invitacion_rate_limits.ventana_inicio end,
    actualizado_en = now()
  returning intentos into v_intentos;
  if v_intentos > 10 then return false; end if;
  select valor into v_hash from public.configuracion_plataforma where clave = 'codigo_invitacion_docente_hash';
  if v_hash is null or extensions.crypt(trim(p_codigo), v_hash) <> v_hash then perform pg_sleep(0.3); return false; end if;
  return true;
end;
$$;
revoke all on function public.validar_codigo_invitacion(text) from public, authenticated;
grant execute on function public.validar_codigo_invitacion(text) to anon, authenticated;

create or replace function public.controlar_rate_limit_recuperacion(p_clave text, p_limite integer, p_ventana_minutos integer)
returns boolean
language plpgsql security definer set search_path = private, pg_catalog
as $$
declare v_intentos integer;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then raise exception 'No autorizado.'; end if;
  if p_clave is null or length(p_clave) > 150 or p_limite < 1 or p_ventana_minutos < 1 then return false; end if;
  delete from private.password_recovery_rate_limits where actualizado_en < now() - interval '1 day';
  insert into private.password_recovery_rate_limits (clave, ventana_inicio, intentos, actualizado_en)
  values (p_clave, now(), 1, now())
  on conflict (clave) do update set
    intentos = case when private.password_recovery_rate_limits.actualizado_en < now() - make_interval(mins => p_ventana_minutos) then 1 else private.password_recovery_rate_limits.intentos + 1 end,
    ventana_inicio = case when private.password_recovery_rate_limits.actualizado_en < now() - make_interval(mins => p_ventana_minutos) then now() else private.password_recovery_rate_limits.ventana_inicio end,
    actualizado_en = now()
  returning intentos into v_intentos;
  return v_intentos <= p_limite;
end;
$$;
revoke all on function public.controlar_rate_limit_recuperacion(text, integer, integer) from public, anon, authenticated;
grant execute on function public.controlar_rate_limit_recuperacion(text, integer, integer) to service_role;

-- El ingreso estudiantil añade un límite compartido por grupo, retardo
-- uniforme para nombres inexistentes y exige que un registro sin hash use los
-- últimos cuatro dígitos de su boleta. Así una fila incompleta no puede ser
-- reclamada con cualquier NIP.
create or replace function public.ingresar_estudiante(p_codigo text, p_nombre text, p_nip text)
returns table(id uuid, nombre text, grupo_id uuid, grupo_nombre text, nip_nuevo boolean, error text)
language plpgsql security definer set search_path = public, extensions
as $$
declare v_grupo record; v_estudiante record; v_intentos_nombre record; v_intentos_grupo int;
  v_error_datos constant text := 'No pudimos validar tus datos. Revisa el código, tu nombre y tu NIP.';
  v_max_intentos constant int := 5; v_minutos_bloqueo constant int := 15;
begin
  if auth.uid() is null then raise exception 'Sesión inválida, intenta de nuevo'; end if;
  if coalesce(auth.jwt() ->> 'is_anonymous', 'false') <> 'true' then raise exception 'Este acceso requiere una sesión de estudiante.'; end if;
  if length(trim(coalesce(p_codigo, ''))) < 4 or length(trim(coalesce(p_codigo, ''))) > 64 then raise exception 'El código de grupo no es válido.'; end if;
  if p_nombre is null or length(trim(p_nombre)) = 0 or length(p_nombre) > 200 then raise exception 'Escribe tu nombre completo.'; end if;
  if coalesce(p_nip, '') !~ '^[0-9]{4}$' then raise exception 'Tu NIP debe ser de 4 dígitos.'; end if;
  select g.id, g.nombre into v_grupo from public.grupos g where g.codigo_acceso = trim(p_codigo) and g.activo = true;
  if v_grupo.id is null then perform pg_sleep(0.2); return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return; end if;
  insert into public.intentos_nombre_grupo (grupo_id, intentos, ventana_inicio)
    values (v_grupo.id, 1, now())
    on conflict (grupo_id) do update set
      intentos = case when public.intentos_nombre_grupo.ventana_inicio < now() - interval '5 minutes' then 1 else public.intentos_nombre_grupo.intentos + 1 end,
      ventana_inicio = case when public.intentos_nombre_grupo.ventana_inicio < now() - interval '5 minutes' then now() else public.intentos_nombre_grupo.ventana_inicio end
    returning intentos into v_intentos_grupo;
  if v_intentos_grupo > 180 then perform pg_sleep(0.2); return query select null::uuid, null::text, null::uuid, null::text, null::boolean, 'Demasiadas solicitudes para este grupo. Intenta de nuevo en unos minutos.'::text; return; end if;
  delete from public.intentos_nombre_estudiante where actualizado_en < now() - interval '1 day';
  select * into v_intentos_nombre from public.intentos_nombre_estudiante where usuario_id = auth.uid();
  if v_intentos_nombre.bloqueado_hasta is not null and v_intentos_nombre.bloqueado_hasta > now() then
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, format('Demasiados intentos. Espera %s minutos e intenta de nuevo.', greatest(1, ceil(extract(epoch from (v_intentos_nombre.bloqueado_hasta - now())) / 60)))::text; return;
  end if;
  select e.id, e.nombre, e.boleta, e.nip_hash, e.activo, e.auth_user_id, e.debe_cambiar_nip, e.intentos_fallidos, e.bloqueado_hasta into v_estudiante
    from public.estudiantes e where e.grupo_id = v_grupo.id and public.normalizar_nombre(e.nombre) = public.normalizar_nombre(p_nombre) for update;
  if v_estudiante.id is null then
    insert into public.intentos_nombre_estudiante (usuario_id, intentos, bloqueado_hasta, actualizado_en) values (auth.uid(), 1, null, now())
      on conflict (usuario_id) do update set
        intentos = case when public.intentos_nombre_estudiante.actualizado_en < now() - interval '1 day' then 1 else public.intentos_nombre_estudiante.intentos + 1 end,
        bloqueado_hasta = case when (case when public.intentos_nombre_estudiante.actualizado_en < now() - interval '1 day' then 1 else public.intentos_nombre_estudiante.intentos + 1 end) >= v_max_intentos then now() + (v_minutos_bloqueo || ' minutes')::interval else public.intentos_nombre_estudiante.bloqueado_hasta end,
        actualizado_en = now();
    perform pg_sleep(0.2); return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return;
  end if;
  if not v_estudiante.activo then perform pg_sleep(0.2); return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return; end if;
  if v_estudiante.bloqueado_hasta is not null and v_estudiante.bloqueado_hasta > now() then
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, format('Demasiados intentos. Espera %s minutos e intenta de nuevo.', greatest(1, ceil(extract(epoch from (v_estudiante.bloqueado_hasta - now())) / 60)))::text; return;
  end if;
  delete from public.intentos_nombre_estudiante where usuario_id = auth.uid();
  if v_estudiante.nip_hash is null then
    if v_estudiante.boleta is null or right(regexp_replace(v_estudiante.boleta, '\D', '', 'g'), 4) <> p_nip then perform pg_sleep(0.2); return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return; end if;
    if v_estudiante.auth_user_id is not null and v_estudiante.auth_user_id <> auth.uid() then perform pg_sleep(0.2); return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return; end if;
    update public.estudiantes set auth_user_id = null where auth_user_id = auth.uid() and public.estudiantes.id <> v_estudiante.id;
    update public.estudiantes set auth_user_id = auth.uid(), nip_hash = extensions.crypt(p_nip, extensions.gen_salt('bf')), intentos_fallidos = 0, bloqueado_hasta = null where public.estudiantes.id = v_estudiante.id;
    return query select v_estudiante.id, v_estudiante.nombre, v_grupo.id, v_grupo.nombre, true, null::text; return;
  end if;
  if extensions.crypt(p_nip, v_estudiante.nip_hash) <> v_estudiante.nip_hash then
    update public.estudiantes set intentos_fallidos = v_estudiante.intentos_fallidos + 1, bloqueado_hasta = case when v_estudiante.intentos_fallidos + 1 >= v_max_intentos then now() + (v_minutos_bloqueo || ' minutes')::interval else bloqueado_hasta end where public.estudiantes.id = v_estudiante.id;
    perform pg_sleep(0.2); return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return;
  end if;
  if v_estudiante.debe_cambiar_nip and v_estudiante.auth_user_id is not null and v_estudiante.auth_user_id <> auth.uid() then perform pg_sleep(0.2); return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return; end if;
  update public.estudiantes set auth_user_id = null where auth_user_id = auth.uid() and public.estudiantes.id <> v_estudiante.id;
  update public.estudiantes set auth_user_id = auth.uid(), intentos_fallidos = 0, bloqueado_hasta = null where public.estudiantes.id = v_estudiante.id;
  return query select v_estudiante.id, v_estudiante.nombre, v_grupo.id, v_grupo.nombre, false, null::text;
end;
$$;
