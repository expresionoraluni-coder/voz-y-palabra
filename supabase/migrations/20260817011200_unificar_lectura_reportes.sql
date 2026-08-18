-- Unifica las dos rutas de lectura para que Postgres evalúe una sola policy
-- por fila, manteniendo la separación entre reportante y administrador.
drop policy if exists "reportante ve sus reportes" on public.reportes;
drop policy if exists "administrador ve todos los reportes" on public.reportes;
create policy "reportes visibles para reportante o administrador" on public.reportes
  for select to authenticated
  using (
    reportante_id = (select auth.uid())
    or exists (
      select 1 from public.administradores a
      where a.id = (select auth.uid()) and a.activo = true
    )
  );
