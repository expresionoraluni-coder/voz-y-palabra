-- Las tablas de auditoría se consultan por la persona que actuó. Postgres no
-- crea automáticamente índices para llaves foráneas.
create index if not exists reporte_eventos_actor_id_idx
  on public.reporte_eventos(actor_id);

create index if not exists admin_session_activity_user_id_idx
  on public.admin_session_activity(user_id);
