begin;

-- Bitácora solo tenía tres lecturas; se conserva su unión en una policy.
drop policy if exists "estudiante lee su bitácora" on public.bitacora;
drop policy if exists "docente ve bitacora de sus grupos" on public.bitacora;
drop policy if exists "administrador observa bitácora" on public.bitacora;
drop policy if exists "estudiante, docente o administrador lee bitácora" on public.bitacora;
create policy "estudiante, docente o administrador lee bitácora" on public.bitacora
  for select to authenticated using (
    estudiante_id = public.estudiante_actual()
    or estudiante_id in (
      select e.id from public.estudiantes e
      join public.grupos g on g.id = e.grupo_id
      where g.docente_id = (select auth.uid())
    )
    or public.es_administrador_activo()
  );

-- La lectura se unifica; la docente conserva exactamente sus permisos de
-- INSERT, UPDATE y DELETE mediante policies separadas.
drop policy if exists "docente administra su retroalimentación" on public.retroalimentacion_docente;
drop policy if exists "estudiante lee retroalimentación de sus entregas" on public.retroalimentacion_docente;
drop policy if exists "administrador observa retroalimentación" on public.retroalimentacion_docente;
drop policy if exists "estudiante, docente o administrador lee retroalimentación" on public.retroalimentacion_docente;
drop policy if exists "docente crea retroalimentación" on public.retroalimentacion_docente;
drop policy if exists "docente actualiza retroalimentación" on public.retroalimentacion_docente;
drop policy if exists "docente elimina retroalimentación" on public.retroalimentacion_docente;
create policy "estudiante, docente o administrador lee retroalimentación" on public.retroalimentacion_docente
  for select to authenticated using (
    (
      docente_id = (select auth.uid())
      and entrega_id in (
        select en.id
        from public.entregas en
        join public.estudiantes e on e.id = en.estudiante_id
        join public.grupos g on g.id = e.grupo_id
        where g.docente_id = (select auth.uid())
      )
    )
    or entrega_id in (select id from public.entregas where estudiante_id = public.estudiante_actual())
    or public.es_administrador_activo()
  );
create policy "docente crea retroalimentación" on public.retroalimentacion_docente
  for insert to authenticated with check (
    docente_id = (select auth.uid())
    and entrega_id in (
      select en.id
      from public.entregas en
      join public.estudiantes e on e.id = en.estudiante_id
      join public.grupos g on g.id = e.grupo_id
      where g.docente_id = (select auth.uid())
    )
  );
create policy "docente actualiza retroalimentación" on public.retroalimentacion_docente
  for update to authenticated using (
    docente_id = (select auth.uid())
    and entrega_id in (
      select en.id
      from public.entregas en
      join public.estudiantes e on e.id = en.estudiante_id
      join public.grupos g on g.id = e.grupo_id
      where g.docente_id = (select auth.uid())
    )
  ) with check (
    docente_id = (select auth.uid())
    and entrega_id in (
      select en.id
      from public.entregas en
      join public.estudiantes e on e.id = en.estudiante_id
      join public.grupos g on g.id = e.grupo_id
      where g.docente_id = (select auth.uid())
    )
  );
create policy "docente elimina retroalimentación" on public.retroalimentacion_docente
  for delete to authenticated using (
    docente_id = (select auth.uid())
    and entrega_id in (
      select en.id
      from public.entregas en
      join public.estudiantes e on e.id = en.estudiante_id
      join public.grupos g on g.id = e.grupo_id
      where g.docente_id = (select auth.uid())
    )
  );

commit;


