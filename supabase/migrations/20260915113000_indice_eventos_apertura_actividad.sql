-- Cubre la llave foránea de la apertura programada para no recorrer todo el
-- calendario cuando una actividad se consulta o se elimina.
create index if not exists eventos_actividad_unidad_id_idx
  on public.eventos (actividad_id, unidad_id);
