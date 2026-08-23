begin;

-- Cubren las llaves foráneas de las nuevas tablas y evitan joins innecesariamente
-- costosos al consultar autores, artículos y reportes relacionados.
create index if not exists reporte_mensajes_autor_idx
  on public.reporte_mensajes (autor_id);
create index if not exists faq_articulos_creado_por_idx
  on public.faq_articulos (creado_por);
create index if not exists faq_articulos_actualizado_por_idx
  on public.faq_articulos (actualizado_por);
create index if not exists faq_interacciones_actor_idx
  on public.faq_interacciones (actor_id);
create index if not exists faq_interacciones_reporte_idx
  on public.faq_interacciones (reporte_id);

-- La política administrativa solo necesita cubrir escritura. Dejarla fuera de
-- SELECT evita dos políticas permisivas para la misma lectura autenticada.
drop policy if exists "admin administra faq" on public.faq_articulos;
create policy "admin crea faq"
  on public.faq_articulos for insert to authenticated
  with check (public.es_administrador_activo());
create policy "admin actualiza faq"
  on public.faq_articulos for update to authenticated
  using (public.es_administrador_activo())
  with check (public.es_administrador_activo());
create policy "admin elimina faq"
  on public.faq_articulos for delete to authenticated
  using (public.es_administrador_activo());

commit;
