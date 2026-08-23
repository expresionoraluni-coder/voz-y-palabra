begin;

-- Ambas policies de UPDATE tenían la misma condición de pertenencia. Una
-- sola policy conserva exactamente el acceso de la docente y evita que
-- Postgres evalúe dos reglas permisivas para cada actualización.
drop policy if exists "docente actualiza apoyo en entregas" on public.entregas;
drop policy if exists "docente actualiza estado de entregas de sus grupos" on public.entregas;
create policy "docente actualiza entregas de sus grupos" on public.entregas
  for update to authenticated
  using (
    estudiante_id in (
      select e.id from public.estudiantes e
      join public.grupos g on g.id = e.grupo_id
      where g.docente_id = (select auth.uid())
    )
  )
  with check (
    estudiante_id in (
      select e.id from public.estudiantes e
      join public.grupos g on g.id = e.grupo_id
      where g.docente_id = (select auth.uid())
    )
  );

-- UPDATE debe proteger también el valor nuevo; sin WITH CHECK una fila
-- podría cambiar de propietario durante la actualización.
alter policy "docente edita su propio perfil" on public.docentes
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

commit;
