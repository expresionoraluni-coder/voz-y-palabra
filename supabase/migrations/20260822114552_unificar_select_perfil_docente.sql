begin;

-- Las dos policies de SELECT tenían predicados OR equivalentes desde el
-- punto de vista del acceso: la docente ve su fila y la administración ve
-- las filas de docentes. Se conserva exactamente esa unión en una sola
-- policy para que Postgres evalúe una sola regla por consulta.
drop policy if exists "docente ve su propio perfil" on public.docentes;
drop policy if exists "administrador observa docentes" on public.docentes;
drop policy if exists "docente o administrador ve perfiles docentes" on public.docentes;
create policy "docente o administrador ve perfiles docentes"
  on public.docentes
  for select to authenticated
  using (
    id = (select auth.uid())
    or public.es_administrador_activo()
  );

commit;


