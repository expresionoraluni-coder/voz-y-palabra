begin;

-- RLS decide qué filas puede usar cada sesión; estos grants limitan además
-- qué operaciones puede intentar cada rol sobre las tablas nuevas.
revoke all on public.reporte_mensajes, public.faq_articulos, public.faq_interacciones
  from public, anon, authenticated;
grant select, insert on public.reporte_mensajes to authenticated;
grant select, insert, update, delete on public.faq_articulos to authenticated;
grant select, insert on public.faq_interacciones to authenticated;

-- Solo los RPC de interacción y conversación son parte del contrato del cliente.
revoke execute on function public.registrar_interaccion_faq(uuid, text, uuid, jsonb)
  from public, anon;
grant execute on function public.registrar_interaccion_faq(uuid, text, uuid, jsonb)
  to authenticated;
revoke execute on function public.registrar_mensaje_reporte(uuid, text)
  from public, anon;
grant execute on function public.registrar_mensaje_reporte(uuid, text)
  to authenticated;

-- Las funciones de trigger no deben exponerse como RPC del Data API.
revoke execute on function public.establecer_fecha_limite_reporte() from public, anon, authenticated;
revoke execute on function public.proteger_reporte_atencion() from public, anon, authenticated;
revoke execute on function public.registrar_evento_reporte_atencion() from public, anon, authenticated;

commit;
