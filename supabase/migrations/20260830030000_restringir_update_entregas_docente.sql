-- El rol authenticated también identifica sesiones anónimas de estudiantes.
-- El update directo de entregas debe exigir una cuenta docente permanente.
drop policy if exists "docente actualiza entregas de sus grupos" on public.entregas;
create policy "docente actualiza entregas de sus grupos" on public.entregas
  for update to authenticated
  using (
    public.es_docente_activo()
    and estudiante_id in (
      select e.id
      from public.estudiantes e
      join public.grupos g on g.id = e.grupo_id
      where g.docente_id = (select auth.uid())
    )
  )
  with check (
    public.es_docente_activo()
    and estudiante_id in (
      select e.id
      from public.estudiantes e
      join public.grupos g on g.id = e.grupo_id
      where g.docente_id = (select auth.uid())
    )
  );
