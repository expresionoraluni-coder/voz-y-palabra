-- Las operaciones de avisos y eventos solo son para docentes autenticadas.
-- Las condiciones de ownership permanecen en la migración anterior.

alter policy "docente administra sus avisos"
  on public.avisos
  to authenticated;

alter policy "docente administra sus eventos"
  on public.eventos
  to authenticated;

