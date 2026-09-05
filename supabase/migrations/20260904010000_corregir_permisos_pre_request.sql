-- PostgREST resuelve el pre-request desde el esquema expuesto. La función
-- pública solo delega en el helper SECURITY DEFINER; las tablas y el helper
-- real siguen en `private`, sin permisos para las cuentas del navegador.
create or replace function public.controlar_rate_limit_ingreso()
returns void
language plpgsql
security definer
set search_path = private, pg_catalog
as $$
begin
  perform private.controlar_rate_limit_ingreso();
end;
$$;

revoke all on function public.controlar_rate_limit_ingreso() from public;
grant execute on function public.controlar_rate_limit_ingreso() to anon, authenticated, authenticator, service_role;
alter role authenticator set pgrst.db_pre_request = 'public.controlar_rate_limit_ingreso';
notify pgrst, 'reload config';

create or replace function public.validar_codigo_invitacion(p_codigo text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, private, pg_catalog
as $$
declare
  v_headers jsonb := '{}'::jsonb;
  v_origen text;
  v_intentos int;
  v_hash text;
begin
  if p_codigo is null or length(trim(p_codigo)) not between 4 and 64 then return false; end if;
  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  exception when others then
    v_headers := '{}'::jsonb;
  end;
  v_origen := coalesce(
    nullif(btrim(v_headers ->> 'cf-connecting-ip'), ''),
    nullif(btrim(v_headers ->> 'x-nf-client-connection-ip'), ''),
    nullif(btrim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)), ''),
    nullif(btrim(v_headers ->> 'x-real-ip'), '')
  );
  if v_origen is null then return false; end if;

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
  if v_hash is null or extensions.crypt(trim(p_codigo), v_hash) <> v_hash then
    perform pg_sleep(0.3);
    return false;
  end if;
  return true;
end;
$$;

revoke all on function public.validar_codigo_invitacion(text) from public, authenticated;
grant execute on function public.validar_codigo_invitacion(text) to anon, authenticated;

create or replace function public.controlar_rate_limit_recuperacion(
  p_clave text,
  p_limite integer,
  p_ventana_minutos integer
)
returns boolean
language plpgsql
security definer
set search_path = private, pg_catalog
as $$
declare
  v_intentos integer;
  v_rol text;
begin
  begin
    v_rol := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  exception when others then
    v_rol := null;
  end;
  if v_rol <> 'service_role' then raise exception 'No autorizado.'; end if;
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
