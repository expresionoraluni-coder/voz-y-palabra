-- Supabase expone el rol de la clave de servidor dentro de
-- request.jwt.claims. La variable request.jwt.claim.role ya no es fiable
-- para autorizar el RPC interno de recuperación.
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
