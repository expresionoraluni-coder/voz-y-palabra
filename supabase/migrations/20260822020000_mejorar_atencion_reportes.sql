-- Mejora la operación del panel administrativo:
-- - valida transiciones de estado en la base, no solo en la interfaz;
-- - evita crear eventos de auditoría cuando no cambió la atención;
-- - conserva la resolución y el historial bajo el mismo control MFA/AAL2.

create or replace function public.proteger_reporte_atencion()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.id is distinct from old.id
    or new.reportante_id is distinct from old.reportante_id
    or new.reportante_tipo is distinct from old.reportante_tipo
    or new.estudiante_id is distinct from old.estudiante_id
    or new.docente_id is distinct from old.docente_id
    or new.grupo_id is distinct from old.grupo_id
    or new.unidad_id is distinct from old.unidad_id
    or new.actividad_id is distinct from old.actividad_id
    or new.categoria is distinct from old.categoria
    or new.descripcion is distinct from old.descripcion
    or new.ruta is distinct from old.ruta
    or new.contexto is distinct from old.contexto
    or new.created_at is distinct from old.created_at then
    raise exception 'Los datos originales del reporte no se pueden modificar.';
  end if;
  if auth.uid() is not null and not public.es_administrador_activo() then
    raise exception 'No tienes permiso para atender reportes.';
  end if;
  if auth.uid() is not null and new.atendido_por is not null and new.atendido_por <> (select auth.uid()) then
    raise exception 'El reporte debe quedar atendido por la cuenta administrativa activa.';
  end if;
  if new.estado is distinct from old.estado and not (
    (old.estado = 'recibido' and new.estado in ('en_revision', 'necesita_informacion', 'resuelto', 'cerrado'))
    or (old.estado = 'en_revision' and new.estado in ('necesita_informacion', 'resuelto', 'cerrado'))
    or (old.estado = 'necesita_informacion' and new.estado in ('en_revision', 'resuelto', 'cerrado'))
    or (old.estado = 'resuelto' and new.estado in ('en_revision', 'cerrado'))
    or (old.estado = 'cerrado' and new.estado = 'en_revision')
  ) then
    raise exception 'La transición del reporte no es válida.';
  end if;
  if new.estado is not distinct from old.estado
    and new.prioridad is not distinct from old.prioridad
    and new.resolucion is not distinct from old.resolucion then
    return new;
  end if;
  if new.estado in ('resuelto', 'cerrado') and nullif(trim(new.resolucion), '') is null then
    raise exception 'Una atención resuelta o cerrada necesita una nota.';
  end if;
  if auth.uid() is not null then new.atendido_por := (select auth.uid()); end if;
  if new.estado in ('resuelto', 'cerrado') and old.estado not in ('resuelto', 'cerrado') then
    new.atendido_en := clock_timestamp();
  elsif new.estado not in ('resuelto', 'cerrado') then
    new.atendido_en := null;
  else
    new.atendido_en := old.atendido_en;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

revoke execute on function public.proteger_reporte_atencion() from public, anon, authenticated;

create or replace function public.registrar_evento_reporte_atencion()
returns trigger language plpgsql security definer set search_path = public, auth
as $$
begin
  if new.estado is not distinct from old.estado
    and new.prioridad is not distinct from old.prioridad
    and new.resolucion is not distinct from old.resolucion then
    return new;
  end if;
  insert into public.reporte_eventos (
    reporte_id, actor_id, actor_nombre, estado_anterior, estado_nuevo,
    prioridad_anterior, prioridad_nueva, resolucion_anterior, resolucion_nueva
  ) values (
    new.id,
    (select auth.uid()),
    coalesce((select a.nombre from public.administradores a where a.id = (select auth.uid())), 'Sistema'),
    old.estado,
    new.estado,
    old.prioridad,
    new.prioridad,
    old.resolucion,
    new.resolucion
  );
  return new;
end;
$$;

revoke execute on function public.registrar_evento_reporte_atencion() from public, anon, authenticated;
