-- La invitación se valida de forma atómica en el trigger de auth.users.
-- No se expone un RPC SECURITY DEFINER que permita probar el secreto desde
-- una sesión anónima antes del registro.
drop function if exists public.validar_codigo_invitacion(text);

-- El wrapper solo es llamado por PostgREST como authenticator mediante
-- pgrst.db_pre_request; no debe ser un endpoint para clientes.
revoke all on function public.controlar_rate_limit_ingreso() from public, anon, authenticated;
grant execute on function public.controlar_rate_limit_ingreso() to authenticator, service_role;
alter role authenticator set pgrst.db_pre_request = 'public.controlar_rate_limit_ingreso';
notify pgrst, 'reload config';
