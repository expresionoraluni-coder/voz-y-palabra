-- Defensa en profundidad: RLS sigue siendo el control de filas y estos
-- grants limitan las operaciones que el Data API puede intentar emitir.
revoke all on public.actividades, public.autoevaluaciones_confianza,
  public.avisos, public.bitacora, public.entregas, public.eventos,
  public.grupos, public.insignias, public.insignias_otorgadas,
  public.retroalimentacion_docente, public.tipos_actividad, public.unidades
  from public, anon, authenticated;

grant select, insert, update, delete on public.actividades, public.grupos, public.eventos, public.unidades to authenticated;
grant select, update on public.entregas to authenticated;
grant select on public.autoevaluaciones_confianza, public.avisos, public.bitacora,
  public.insignias, public.insignias_otorgadas, public.retroalimentacion_docente,
  public.tipos_actividad to authenticated;
grant insert, update, delete on public.avisos, public.retroalimentacion_docente to authenticated;
