begin;

-- La nota interna, responsables, fechas operativas y marcas de atención no
-- deben ser legibles por reportantes desde el Data API. El panel admin usa el
-- cliente de servicio solo después de validar la sesión administrativa y MFA.
revoke select on public.reportes from public, anon, authenticated;
grant select (
  id, reportante_id, reportante_tipo, categoria, descripcion, estado, prioridad,
  grupo_id, unidad_id, actividad_id, ruta, contexto, respuesta_publica,
  created_at, updated_at
) on public.reportes to authenticated;

commit;
