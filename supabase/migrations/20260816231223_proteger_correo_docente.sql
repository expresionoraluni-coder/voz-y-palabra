-- El correo de la docente es un dato sensible de autenticación.
-- El panel solo necesita id, nombre y fecha de alta.
revoke select on public.docentes from public, anon, authenticated;
grant select (id, nombre, created_at) on public.docentes to authenticated;
grant all on public.docentes to service_role;
