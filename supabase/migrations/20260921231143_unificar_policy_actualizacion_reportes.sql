-- Una sola policy UPDATE evita evaluar dos policies permisivas para cada
-- actualización. Admin conserva su atención completa y el reportante solo
-- llega a la columna concedida para confirmar una respuesta leída.
drop policy if exists "administrador atiende reportes" on public.reportes;
drop policy if exists "reportante confirma lectura del reporte" on public.reportes;
create policy "administrador atiende o reportante confirma lectura" on public.reportes
  for update to authenticated
  using (
    public.es_administrador_activo()
    or private.es_reportante_actual_de_reporte(id)
  )
  with check (
    (public.es_administrador_activo() and (atendido_por is null or atendido_por = (select auth.uid())))
    or private.es_reportante_actual_de_reporte(id)
  );
