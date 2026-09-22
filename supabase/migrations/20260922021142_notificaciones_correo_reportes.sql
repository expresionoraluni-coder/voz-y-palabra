-- Bitácora privada e idempotente para alertas de reportes. No pertenece a la
-- API de datos; únicamente el Route Handler de servidor usa service_role.
create table private.notificaciones_correo_reportes (
  reporte_id uuid primary key references public.reportes(id) on delete cascade,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'enviando', 'enviada', 'fallida')),
  intentos integer not null default 0 check (intentos >= 0),
  en_proceso_desde timestamptz,
  creado_en timestamptz not null default now(),
  enviada_en timestamptz
);

alter table private.notificaciones_correo_reportes enable row level security;
revoke all on private.notificaciones_correo_reportes from public, anon, authenticated;
grant all on private.notificaciones_correo_reportes to service_role;

-- Las funciones se ejecutan con privilegios de su dueña para operar la tabla
-- privada, pero se revocan para todos los roles públicos y se conceden
-- únicamente a service_role. La llamada a Gmail ocurre fuera de la transacción.
create or replace function public.reclamar_notificacion_correo_reporte(p_reporte_id uuid)
returns boolean
language plpgsql security definer set search_path = private, public, pg_catalog
as $$
declare v_reclamado boolean;
begin
  insert into private.notificaciones_correo_reportes (reporte_id)
  values (p_reporte_id)
  on conflict (reporte_id) do nothing;

  update private.notificaciones_correo_reportes
     set estado = 'enviando',
         intentos = intentos + 1,
         en_proceso_desde = clock_timestamp()
   where reporte_id = p_reporte_id
     and (
       estado in ('pendiente', 'fallida')
       or (estado = 'enviando' and en_proceso_desde < clock_timestamp() - interval '10 minutes')
     )
  returning true into v_reclamado;

  return coalesce(v_reclamado, false);
end;
$$;
revoke all on function public.reclamar_notificacion_correo_reporte(uuid) from public, anon, authenticated;
grant execute on function public.reclamar_notificacion_correo_reporte(uuid) to service_role;

create or replace function public.finalizar_notificacion_correo_reporte(
  p_reporte_id uuid,
  p_enviada boolean
)
returns void
language plpgsql security definer set search_path = private, public, pg_catalog
as $$
begin
  update private.notificaciones_correo_reportes
     set estado = case when p_enviada then 'enviada' else 'fallida' end,
         en_proceso_desde = null,
         enviada_en = case when p_enviada then clock_timestamp() else null end
   where reporte_id = p_reporte_id
     and estado = 'enviando';
end;
$$;
revoke all on function public.finalizar_notificacion_correo_reporte(uuid, boolean) from public, anon, authenticated;
grant execute on function public.finalizar_notificacion_correo_reporte(uuid, boolean) to service_role;
