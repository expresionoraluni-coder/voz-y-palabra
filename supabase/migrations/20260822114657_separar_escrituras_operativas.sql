begin;

-- Se elimina el solapamiento producido por policies FOR ALL. La lectura
-- conserva exactamente las ramas docente/estudiante/administración y las
-- escrituras quedan limitadas a la docente propietaria.
drop policy if exists "docente administra sus avisos" on public.avisos;
drop policy if exists "estudiante lee avisos de su grupo" on public.avisos;
drop policy if exists "administrador observa avisos" on public.avisos;
drop policy if exists "estudiante, docente o administrador lee avisos" on public.avisos;
drop policy if exists "docente crea avisos" on public.avisos;
drop policy if exists "docente actualiza avisos" on public.avisos;
drop policy if exists "docente elimina avisos" on public.avisos;
create policy "estudiante, docente o administrador lee avisos" on public.avisos for select to authenticated
  using ((docente_id = (select auth.uid()) and (grupo_id is null or exists (select 1 from public.grupos where grupos.id = public.avisos.grupo_id and grupos.docente_id = (select auth.uid())))) or grupo_id is null or grupo_id = (select grupo_id from public.estudiantes where id = public.estudiante_actual()) or public.es_administrador_activo());
create policy "docente crea avisos" on public.avisos for insert to authenticated
  with check (docente_id = (select auth.uid()) and (grupo_id is null or exists (select 1 from public.grupos where grupos.id = public.avisos.grupo_id and grupos.docente_id = (select auth.uid()))));
create policy "docente actualiza avisos" on public.avisos for update to authenticated
  using (docente_id = (select auth.uid()) and (grupo_id is null or exists (select 1 from public.grupos where grupos.id = public.avisos.grupo_id and grupos.docente_id = (select auth.uid()))))
  with check (docente_id = (select auth.uid()) and (grupo_id is null or exists (select 1 from public.grupos where grupos.id = public.avisos.grupo_id and grupos.docente_id = (select auth.uid()))));
create policy "docente elimina avisos" on public.avisos for delete to authenticated
  using (docente_id = (select auth.uid()) and (grupo_id is null or exists (select 1 from public.grupos where grupos.id = public.avisos.grupo_id and grupos.docente_id = (select auth.uid()))));

drop policy if exists "docente administra sus eventos" on public.eventos;
drop policy if exists "estudiante lee eventos de su grupo" on public.eventos;
drop policy if exists "administrador observa eventos" on public.eventos;
drop policy if exists "estudiante, docente o administrador lee eventos" on public.eventos;
drop policy if exists "docente crea eventos" on public.eventos;
drop policy if exists "docente actualiza eventos" on public.eventos;
drop policy if exists "docente elimina eventos" on public.eventos;
create policy "estudiante, docente o administrador lee eventos" on public.eventos for select to authenticated
  using ((docente_id = (select auth.uid()) and exists (select 1 from public.grupos where grupos.id = public.eventos.grupo_id and grupos.docente_id = (select auth.uid()))) or grupo_id = (select grupo_id from public.estudiantes where id = public.estudiante_actual()) or public.es_administrador_activo());
create policy "docente crea eventos" on public.eventos for insert to authenticated
  with check (docente_id = (select auth.uid()) and exists (select 1 from public.grupos where grupos.id = public.eventos.grupo_id and grupos.docente_id = (select auth.uid())));
create policy "docente actualiza eventos" on public.eventos for update to authenticated
  using (docente_id = (select auth.uid()) and exists (select 1 from public.grupos where grupos.id = public.eventos.grupo_id and grupos.docente_id = (select auth.uid())))
  with check (docente_id = (select auth.uid()) and exists (select 1 from public.grupos where grupos.id = public.eventos.grupo_id and grupos.docente_id = (select auth.uid())));
create policy "docente elimina eventos" on public.eventos for delete to authenticated
  using (docente_id = (select auth.uid()) and exists (select 1 from public.grupos where grupos.id = public.eventos.grupo_id and grupos.docente_id = (select auth.uid())));

drop policy if exists "docente administra sus grupos" on public.grupos;
drop policy if exists "estudiante lee su grupo" on public.grupos;
drop policy if exists "administrador observa grupos" on public.grupos;
drop policy if exists "estudiante, docente o administrador lee grupos" on public.grupos;
drop policy if exists "docente crea grupos" on public.grupos;
drop policy if exists "docente actualiza grupos" on public.grupos;
drop policy if exists "docente elimina grupos" on public.grupos;
create policy "estudiante, docente o administrador lee grupos" on public.grupos for select to authenticated
  using (docente_id = (select auth.uid()) or id = public.grupo_del_estudiante_actual() or public.es_administrador_activo());
create policy "docente crea grupos" on public.grupos for insert to authenticated with check (docente_id = (select auth.uid()));
create policy "docente actualiza grupos" on public.grupos for update to authenticated
  using (docente_id = (select auth.uid())) with check (docente_id = (select auth.uid()));
create policy "docente elimina grupos" on public.grupos for delete to authenticated using (docente_id = (select auth.uid()));

drop policy if exists "docente administra estudiantes de sus grupos" on public.estudiantes;
drop policy if exists "estudiante lee su propia fila" on public.estudiantes;
drop policy if exists "docente o estudiante lee estudiantes permitidos" on public.estudiantes;
drop policy if exists "docente crea estudiantes de sus grupos" on public.estudiantes;
drop policy if exists "docente actualiza estudiantes de sus grupos" on public.estudiantes;
drop policy if exists "docente elimina estudiantes de sus grupos" on public.estudiantes;
create policy "docente o estudiante lee estudiantes permitidos" on public.estudiantes for select to authenticated
  using (grupo_id in (select grupos.id from public.grupos where grupos.docente_id = (select auth.uid())) or (auth_user_id = (select auth.uid()) and activo = true));
create policy "docente crea estudiantes de sus grupos" on public.estudiantes for insert to authenticated
  with check (grupo_id in (select grupos.id from public.grupos where grupos.docente_id = (select auth.uid())));
create policy "docente actualiza estudiantes de sus grupos" on public.estudiantes for update to authenticated
  using (grupo_id in (select grupos.id from public.grupos where grupos.docente_id = (select auth.uid())))
  with check (grupo_id in (select grupos.id from public.grupos where grupos.docente_id = (select auth.uid())));
create policy "docente elimina estudiantes de sus grupos" on public.estudiantes for delete to authenticated
  using (grupo_id in (select grupos.id from public.grupos where grupos.docente_id = (select auth.uid())));

commit;


