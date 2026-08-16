-- Protege columnas internas de estudiantes y limita el RPC de ingreso por IP.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.ingreso_rate_limits (
  ip inet primary key,
  ventana_inicio timestamptz not null default now(),
  intentos int not null default 0 check (intentos >= 0),
  actualizado_en timestamptz not null default now()
);
create index if not exists ingreso_rate_limits_actualizado_idx on private.ingreso_rate_limits(actualizado_en);
revoke all on private.ingreso_rate_limits from public, anon, authenticated;
grant all on private.ingreso_rate_limits to service_role;

create or replace function private.controlar_rate_limit_ingreso()
returns void
language plpgsql
security definer
set search_path = private, pg_catalog
as $$
declare
  v_path text := current_setting('request.path', true);
  v_method text := current_setting('request.method', true);
  v_headers jsonb := '{}'::jsonb;
  v_ip_text text;
  v_ip inet;
  v_intentos int;
begin
  if v_method <> 'POST' or v_path is null or v_path not like '%/rpc/ingresar_estudiante' then
    return;
  end if;

  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  exception when others then
    return;
  end;

  v_ip_text := split_part(coalesce(v_headers ->> 'x-forwarded-for', v_headers ->> 'cf-connecting-ip', ''), ',', 1);
  if btrim(v_ip_text) = '' then return; end if;
  begin
    v_ip := btrim(v_ip_text)::inet;
  exception when others then
    return;
  end;

  delete from private.ingreso_rate_limits
   where actualizado_en < now() - interval '1 day';

  insert into private.ingreso_rate_limits (ip, ventana_inicio, intentos, actualizado_en)
  values (v_ip, now(), 1, now())
  on conflict (ip) do update
    set intentos = case
      when private.ingreso_rate_limits.actualizado_en < now() - interval '5 minutes' then 1
      else private.ingreso_rate_limits.intentos + 1
    end,
    ventana_inicio = case
      when private.ingreso_rate_limits.actualizado_en < now() - interval '5 minutes' then now()
      else private.ingreso_rate_limits.ventana_inicio
    end,
    actualizado_en = now()
  returning intentos into v_intentos;

  if v_intentos > 120 then
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'code', 'INGRESO_RATE_LIMIT',
        'message', 'Demasiadas solicitudes de ingreso desde esta red. Intenta de nuevo en unos minutos.')::text,
      detail = json_build_object('status', 429, 'status_text', 'Too Many Requests')::text;
  end if;
end;
$$;

grant usage on schema private to authenticator;
grant execute on function private.controlar_rate_limit_ingreso() to authenticator;
alter role authenticator set pgrst.db_pre_request = 'private.controlar_rate_limit_ingreso';
notify pgrst, 'reload config';

create or replace function public.ingresar_estudiante(p_codigo text, p_nombre text, p_nip text)
returns table(id uuid, nombre text, grupo_id uuid, grupo_nombre text, nip_nuevo boolean, error text)
language plpgsql security definer set search_path = public, extensions
as $$
declare v_grupo record; v_estudiante record; v_intentos_nombre record;
  v_error_datos constant text := 'No pudimos validar tus datos. Revisa el código, tu nombre y tu NIP.';
  v_max_intentos constant int := 5; v_minutos_bloqueo constant int := 15;
begin
  if auth.uid() is null then raise exception 'Sesión inválida, intenta de nuevo'; end if;
  if coalesce(auth.jwt() ->> 'is_anonymous', 'false') <> 'true' then
    raise exception 'Este acceso requiere una sesión de estudiante.';
  end if;
  if length(trim(coalesce(p_codigo, ''))) < 4 or length(trim(coalesce(p_codigo, ''))) > 64 then
    raise exception 'El código de grupo no es válido.';
  end if;
  if p_nombre is null or length(trim(p_nombre)) = 0 or length(p_nombre) > 200 then
    raise exception 'Escribe tu nombre completo.';
  end if;
  if coalesce(p_nip, '') !~ '^[0-9]{4}$' then raise exception 'Tu NIP debe ser de 4 dígitos.'; end if;
  select g.id, g.nombre into v_grupo from public.grupos g where g.codigo_acceso = trim(p_codigo) and g.activo = true;
  if v_grupo.id is null then return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return; end if;
  select * into v_intentos_nombre from public.intentos_nombre_estudiante where usuario_id = auth.uid();
  if v_intentos_nombre.bloqueado_hasta is not null and v_intentos_nombre.bloqueado_hasta > now() then
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, format('Demasiados intentos. Espera %s minutos e intenta de nuevo.', greatest(1, ceil(extract(epoch from (v_intentos_nombre.bloqueado_hasta - now())) / 60)))::text; return;
  end if;
  select e.id, e.nombre, e.nip_hash, e.activo, e.intentos_fallidos, e.bloqueado_hasta into v_estudiante
    from public.estudiantes e where e.grupo_id = v_grupo.id and public.normalizar_nombre(e.nombre) = public.normalizar_nombre(p_nombre)
    for update;
  if v_estudiante.id is null then
    insert into public.intentos_nombre_estudiante (usuario_id, intentos, bloqueado_hasta) values (auth.uid(), 1, null)
      on conflict (usuario_id) do update set intentos = public.intentos_nombre_estudiante.intentos + 1,
      bloqueado_hasta = case when public.intentos_nombre_estudiante.intentos + 1 >= v_max_intentos then now() + (v_minutos_bloqueo || ' minutes')::interval else public.intentos_nombre_estudiante.bloqueado_hasta end;
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return;
  end if;
  if not v_estudiante.activo then return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return; end if;
  if v_estudiante.bloqueado_hasta is not null and v_estudiante.bloqueado_hasta > now() then
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, format('Demasiados intentos. Espera %s minutos e intenta de nuevo.', greatest(1, ceil(extract(epoch from (v_estudiante.bloqueado_hasta - now())) / 60)))::text; return;
  end if;
  delete from public.intentos_nombre_estudiante where usuario_id = auth.uid();
  if v_estudiante.nip_hash is null then
    update public.estudiantes set auth_user_id = null where auth_user_id = auth.uid() and public.estudiantes.id <> v_estudiante.id;
    update public.estudiantes set auth_user_id = auth.uid(), nip_hash = extensions.crypt(p_nip, extensions.gen_salt('bf')), intentos_fallidos = 0, bloqueado_hasta = null where public.estudiantes.id = v_estudiante.id;
    return query select v_estudiante.id, v_estudiante.nombre, v_grupo.id, v_grupo.nombre, true, null::text; return;
  end if;
  if extensions.crypt(p_nip, v_estudiante.nip_hash) <> v_estudiante.nip_hash then
    update public.estudiantes set intentos_fallidos = v_estudiante.intentos_fallidos + 1, bloqueado_hasta = case when v_estudiante.intentos_fallidos + 1 >= v_max_intentos then now() + (v_minutos_bloqueo || ' minutes')::interval else bloqueado_hasta end where public.estudiantes.id = v_estudiante.id;
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return;
  end if;
  update public.estudiantes set auth_user_id = null where auth_user_id = auth.uid() and public.estudiantes.id <> v_estudiante.id;
  update public.estudiantes set auth_user_id = auth.uid(), intentos_fallidos = 0, bloqueado_hasta = null where public.estudiantes.id = v_estudiante.id;
  return query select v_estudiante.id, v_estudiante.nombre, v_grupo.id, v_grupo.nombre, false, null::text;
end;
$$;

revoke select on public.estudiantes from public, anon, authenticated;
grant select (id, nombre, grupo_id, activo, boleta, debe_cambiar_nip, created_at)
  on public.estudiantes to authenticated;
grant all on public.estudiantes to service_role;

