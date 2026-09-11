-- PostgREST ejecuta db_pre_request después de adoptar el rol del JWT.
-- Por eso el wrapper necesita EXECUTE para los roles de las peticiones de la
-- aplicación, aunque el helper real siga oculto en `private`.
revoke all on function public.controlar_rate_limit_ingreso() from public, anon, authenticated;
grant execute on function public.controlar_rate_limit_ingreso() to anon, authenticated, authenticator, service_role;
alter role authenticator set pgrst.db_pre_request = 'public.controlar_rate_limit_ingreso';
notify pgrst, 'reload config';
