begin;

-- Estas cuatro tablas solo tenían policies SELECT y cada una representaba
-- una rama del mismo permiso por alcance. Se conserva la unión exacta en
-- una sola policy para reducir evaluaciones RLS por consulta.
drop policy if exists "estudiante lee sus entregas" on public.entregas;
drop policy if exists "docente ve entregas de sus grupos" on public.entregas;
drop policy if exists "administrador observa entregas" on public.entregas;
drop policy if exists "estudiante, docente o administrador lee entregas" on public.entregas;
create policy "estudiante, docente o administrador lee entregas" on public.entregas
  for select to authenticated using (
    estudiante_id = public.estudiante_actual()
    or estudiante_id in (
      select e.id from public.estudiantes e
      join public.grupos g on g.id = e.grupo_id
      where g.docente_id = (select auth.uid())
    )
    or public.es_administrador_activo()
  );

drop policy if exists "estudiante lee sus reflexiones" on public.reflexiones;
drop policy if exists "docente ve reflexiones de sus grupos" on public.reflexiones;
drop policy if exists "administrador observa reflexiones" on public.reflexiones;
drop policy if exists "estudiante, docente o administrador lee reflexiones" on public.reflexiones;
create policy "estudiante, docente o administrador lee reflexiones" on public.reflexiones
  for select to authenticated using (
    estudiante_id = public.estudiante_actual()
    or estudiante_id in (
      select e.id from public.estudiantes e
      join public.grupos g on g.id = e.grupo_id
      where g.docente_id = (select auth.uid())
    )
    or public.es_administrador_activo()
  );

drop policy if exists "estudiante lee su confianza" on public.autoevaluaciones_confianza;
drop policy if exists "docente ve confianza de sus grupos" on public.autoevaluaciones_confianza;
drop policy if exists "administrador observa confianza" on public.autoevaluaciones_confianza;
drop policy if exists "estudiante, docente o administrador lee confianza" on public.autoevaluaciones_confianza;
create policy "estudiante, docente o administrador lee confianza" on public.autoevaluaciones_confianza
  for select to authenticated using (
    estudiante_id = public.estudiante_actual()
    or estudiante_id in (
      select e.id from public.estudiantes e
      join public.grupos g on g.id = e.grupo_id
      where g.docente_id = (select auth.uid())
    )
    or public.es_administrador_activo()
  );

drop policy if exists "estudiante lee sus insignias" on public.insignias_otorgadas;
drop policy if exists "docente ve insignias de sus grupos" on public.insignias_otorgadas;
drop policy if exists "administrador observa insignias otorgadas" on public.insignias_otorgadas;
drop policy if exists "estudiante, docente o administrador lee insignias otorgadas" on public.insignias_otorgadas;
create policy "estudiante, docente o administrador lee insignias otorgadas" on public.insignias_otorgadas
  for select to authenticated using (
    estudiante_id = public.estudiante_actual()
    or estudiante_id in (
      select e.id from public.estudiantes e
      join public.grupos g on g.id = e.grupo_id
      where g.docente_id = (select auth.uid())
    )
    or public.es_administrador_activo()
  );

commit;


