-- Las reflexiones de actividad se identifican por actividad. La reflexión
-- final de unidad es la única que debe usar unidad_id para su índice único.
-- No se modifican datos existentes; se elimina únicamente la restricción que
-- hacía competir a varias actividades de la misma unidad.

alter table public.reflexiones
  drop constraint if exists reflexiones_unica_por_unidad;
drop index if exists public.reflexiones_unica_por_unidad;
create unique index if not exists reflexiones_unica_por_unidad
  on public.reflexiones (estudiante_id, unidad_id, momento)
  where actividad_id is null;
