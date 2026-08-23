-- El estudiante todavía no tiene un rol autenticado propio al iniciar sesión.
-- La función valida auth.uid() y exige el claim is_anonymous antes de leer o
-- vincular cualquier registro; solo se concede el permiso de invocación.
-- El pre-request de rate limit se resuelve con el rol de la sesión; esto no
-- concede permisos sobre las tablas privadas.
grant usage on schema private to anon, authenticated;
grant execute on function private.controlar_rate_limit_ingreso() to anon, authenticated;
revoke execute on function public.ingresar_estudiante(text, text, text) from public;
grant execute on function public.ingresar_estudiante(text, text, text) to anon;
grant execute on function public.ingresar_estudiante(text, text, text) to authenticated;
