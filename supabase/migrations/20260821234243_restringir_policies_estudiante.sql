-- Las Server Actions son el único camino de escritura de aprendizaje. Las
-- policies del estudiante quedan explícitamente en solo lectura para que la
-- autorización no dependa únicamente de GRANTs.

drop policy if exists "estudiante administra sus reflexiones" on public.reflexiones;
drop policy if exists "estudiante lee sus reflexiones" on public.reflexiones;
create policy "estudiante lee sus reflexiones" on public.reflexiones
  for select to authenticated
  using (estudiante_id = public.estudiante_actual());

drop policy if exists "estudiante administra su confianza" on public.autoevaluaciones_confianza;
drop policy if exists "estudiante lee su confianza" on public.autoevaluaciones_confianza;
create policy "estudiante lee su confianza" on public.autoevaluaciones_confianza
  for select to authenticated
  using (estudiante_id = public.estudiante_actual());

drop policy if exists "estudiante administra su bitácora" on public.bitacora;
drop policy if exists "estudiante administra su bitacora" on public.bitacora;
drop policy if exists "estudiante lee su bitácora" on public.bitacora;
create policy "estudiante lee su bitácora" on public.bitacora
  for select to authenticated
  using (estudiante_id = public.estudiante_actual());
