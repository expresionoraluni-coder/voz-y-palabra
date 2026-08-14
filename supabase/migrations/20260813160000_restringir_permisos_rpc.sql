-- Los RPC de la aplicación usan sesiones authenticated, incluidas las
-- sesiones anónimas de estudiantes. No deben conservar el permiso heredado
-- de PUBLIC ni quedar disponibles para anon.

revoke execute on function public.agregar_estudiantes_con_boleta(uuid, jsonb) from public, anon;
grant execute on function public.agregar_estudiantes_con_boleta(uuid, jsonb) to authenticated;

revoke execute on function public.reiniciar_nip_estudiante(uuid) from public, anon;
grant execute on function public.reiniciar_nip_estudiante(uuid) to authenticated;

revoke execute on function public.ingresar_estudiante(text, text, text) from public, anon;
grant execute on function public.ingresar_estudiante(text, text, text) to authenticated;

revoke execute on function public.cambiar_nip_estudiante(text, text) from public, anon;
grant execute on function public.cambiar_nip_estudiante(text, text) to authenticated;

revoke execute on function public.crear_perfil_docente(text, text) from public, anon;
grant execute on function public.crear_perfil_docente(text, text) to authenticated;

revoke execute on function public.verificar_insignias() from public, anon;
grant execute on function public.verificar_insignias() to authenticated;

revoke execute on function public.estudiante_actual() from public, anon;
grant execute on function public.estudiante_actual() to authenticated;

revoke execute on function public.grupo_del_estudiante_actual() from public, anon;
grant execute on function public.grupo_del_estudiante_actual() to authenticated;

