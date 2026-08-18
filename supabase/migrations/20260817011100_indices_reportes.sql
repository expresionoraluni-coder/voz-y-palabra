-- Índices para las relaciones que consulta la bandeja administrativa.
create index if not exists reportes_actividad_id_idx on public.reportes(actividad_id);
create index if not exists reportes_atendido_por_idx on public.reportes(atendido_por);
create index if not exists reportes_docente_id_idx on public.reportes(docente_id);
create index if not exists reportes_estudiante_id_idx on public.reportes(estudiante_id);
create index if not exists reportes_unidad_id_idx on public.reportes(unidad_id);
