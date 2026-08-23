begin;

-- Las policies FOR ALL de contenido incluían SELECT y se solapaban con las
-- policies administrativas. Se separan las escrituras y se conserva el mismo
-- permiso de la docente; la administración queda solo en lectura.
drop policy if exists "docente administra unidades" on public.unidades;
drop policy if exists "administrador observa unidades" on public.unidades;
drop policy if exists "docente o administrador lee unidades" on public.unidades;
drop policy if exists "docente crea unidades" on public.unidades;
drop policy if exists "docente actualiza unidades" on public.unidades;
drop policy if exists "docente elimina unidades" on public.unidades;
create policy "docente o administrador lee unidades" on public.unidades for select to authenticated
  using (exists (select 1 from public.docentes where id = (select auth.uid())) or public.es_administrador_activo());
create policy "docente crea unidades" on public.unidades for insert to authenticated
  with check (exists (select 1 from public.docentes where id = (select auth.uid())));
create policy "docente actualiza unidades" on public.unidades for update to authenticated
  using (exists (select 1 from public.docentes where id = (select auth.uid())))
  with check (exists (select 1 from public.docentes where id = (select auth.uid())));
create policy "docente elimina unidades" on public.unidades for delete to authenticated
  using (exists (select 1 from public.docentes where id = (select auth.uid())));

drop policy if exists "docente administra actividades" on public.actividades;
drop policy if exists "administrador observa actividades" on public.actividades;
drop policy if exists "docente o administrador lee actividades" on public.actividades;
drop policy if exists "docente crea actividades" on public.actividades;
drop policy if exists "docente actualiza actividades" on public.actividades;
drop policy if exists "docente elimina actividades" on public.actividades;
create policy "docente o administrador lee actividades" on public.actividades for select to authenticated
  using (exists (select 1 from public.docentes where id = (select auth.uid())) or public.es_administrador_activo());
create policy "docente crea actividades" on public.actividades for insert to authenticated
  with check (exists (select 1 from public.docentes where id = (select auth.uid())));
create policy "docente actualiza actividades" on public.actividades for update to authenticated
  using (exists (select 1 from public.docentes where id = (select auth.uid())))
  with check (exists (select 1 from public.docentes where id = (select auth.uid())));
create policy "docente elimina actividades" on public.actividades for delete to authenticated
  using (exists (select 1 from public.docentes where id = (select auth.uid())));

commit;


