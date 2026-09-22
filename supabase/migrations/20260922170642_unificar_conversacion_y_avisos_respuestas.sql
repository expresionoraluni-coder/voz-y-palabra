-- La conversación es el único canal visible. Conservamos la información
-- existente convirtiendo las respuestas antiguas en mensajes de Administración.
with respuestas_anteriores as (
  select
    r.id as reporte_id,
    trim(r.respuesta_publica) as mensaje,
    coalesce(
      r.atendido_por,
      r.asignado_a,
      (select a.id from public.administradores a where a.activo order by a.created_at asc limit 1)
    ) as autor_id
  from public.reportes r
  where r.respuesta_publica is not null
    and length(trim(r.respuesta_publica)) >= 2
), mensajes_migrados as (
  insert into public.reporte_mensajes (reporte_id, autor_id, autor_tipo, mensaje, visible_para_reportante)
  select respuesta.reporte_id, respuesta.autor_id, 'administrador', respuesta.mensaje, true
  from respuestas_anteriores respuesta
  where respuesta.autor_id is not null
    and not exists (
      select 1 from public.reporte_mensajes mensaje
      where mensaje.reporte_id = respuesta.reporte_id
        and mensaje.autor_tipo = 'administrador'
        and mensaje.mensaje = respuesta.mensaje
    )
  returning reporte_id, mensaje
), respuestas_convertidas as (
  select reporte_id, mensaje from mensajes_migrados
  union
  select reporte.id, trim(reporte.respuesta_publica)
  from public.reportes reporte
  where reporte.respuesta_publica is not null
    and exists (
      select 1 from public.reporte_mensajes mensaje
      where mensaje.reporte_id = reporte.id
        and mensaje.autor_tipo = 'administrador'
        and mensaje.mensaje = trim(reporte.respuesta_publica)
    )
)
update public.reportes reporte
set respuesta_publica = null
from respuestas_convertidas respuesta
where reporte.id = respuesta.reporte_id
  and trim(reporte.respuesta_publica) = respuesta.mensaje;

-- Bitácora privada e idempotente: una respuesta puede reclamar un solo correo
-- en proceso, y una falla se puede reintentar sin exponer la tabla a clientes.
create table if not exists private.notificaciones_correo_mensajes_reportes (
  mensaje_id uuid primary key references public.reporte_mensajes(id) on delete cascade,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'enviando', 'enviada', 'fallida')),
  intentos integer not null default 0 check (intentos >= 0),
  en_proceso_desde timestamptz,
  creado_en timestamptz not null default now(),
  enviada_en timestamptz
);
alter table private.notificaciones_correo_mensajes_reportes enable row level security;
revoke all on private.notificaciones_correo_mensajes_reportes from public, anon, authenticated;
grant all on private.notificaciones_correo_mensajes_reportes to service_role;

create or replace function public.reclamar_notificacion_correo_mensaje_reporte(p_mensaje_id uuid)
returns boolean
language plpgsql security definer set search_path = private, public, pg_catalog
as $$
declare v_reclamado boolean;
begin
  insert into private.notificaciones_correo_mensajes_reportes (mensaje_id)
  values (p_mensaje_id)
  on conflict (mensaje_id) do nothing;

  update private.notificaciones_correo_mensajes_reportes
     set estado = 'enviando',
         intentos = intentos + 1,
         en_proceso_desde = clock_timestamp()
   where mensaje_id = p_mensaje_id
     and (
       estado in ('pendiente', 'fallida')
       or (estado = 'enviando' and en_proceso_desde < clock_timestamp() - interval '10 minutes')
     )
  returning true into v_reclamado;

  return coalesce(v_reclamado, false);
end;
$$;
revoke all on function public.reclamar_notificacion_correo_mensaje_reporte(uuid) from public, anon, authenticated;
grant execute on function public.reclamar_notificacion_correo_mensaje_reporte(uuid) to service_role;

create or replace function public.finalizar_notificacion_correo_mensaje_reporte(
  p_mensaje_id uuid,
  p_enviada boolean
)
returns void
language plpgsql security definer set search_path = private, public, pg_catalog
as $$
begin
  update private.notificaciones_correo_mensajes_reportes
     set estado = case when p_enviada then 'enviada' else 'fallida' end,
         en_proceso_desde = null,
         enviada_en = case when p_enviada then clock_timestamp() else null end
   where mensaje_id = p_mensaje_id
     and estado = 'enviando';
end;
$$;
revoke all on function public.finalizar_notificacion_correo_mensaje_reporte(uuid, boolean) from public, anon, authenticated;
grant execute on function public.finalizar_notificacion_correo_mensaje_reporte(uuid, boolean) to service_role;
