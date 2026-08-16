-- Corrige el contexto de ejecución del pre-request de PostgREST.
-- La tabla de contadores sigue en `private`; la función debe estar en un
-- esquema expuesto porque corre con el rol de la petición.
drop function if exists private.controlar_rate_limit_ingreso();

create or replace function public.controlar_rate_limit_ingreso()
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

grant execute on function public.controlar_rate_limit_ingreso() to public;
alter role authenticator set pgrst.db_pre_request = 'public.controlar_rate_limit_ingreso';
notify pgrst, 'reload config';
