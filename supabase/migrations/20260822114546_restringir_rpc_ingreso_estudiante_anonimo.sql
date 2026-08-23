begin;

-- El cliente crea primero una sesión anónima y Supabase la ejecuta con el
-- rol authenticated. Mantener el RPC disponible para anon permitiría llamar
-- directamente a la función sin crear esa sesión y no es necesario para el
-- flujo de ingreso.
revoke execute on function public.ingresar_estudiante(text, text, text) from anon;

commit;


