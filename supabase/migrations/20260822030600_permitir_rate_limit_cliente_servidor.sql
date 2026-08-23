-- Las lecturas server-side usan service_role, pero PostgREST aplica también
-- su función pre-request de rate limit a ese cliente. El permiso queda
-- limitado al esquema privado y a la función interna; no expone sus tablas ni
-- convierte la función en un RPC público.
grant usage on schema private to service_role;
grant execute on function private.controlar_rate_limit_ingreso() to service_role;
