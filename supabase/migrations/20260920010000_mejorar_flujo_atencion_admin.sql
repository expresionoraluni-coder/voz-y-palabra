begin;

-- La conversación se ejecuta con los permisos del usuario y RLS valida que
-- participe en el caso. Conservamos el privilegio de INSERT también para las
-- instalaciones creadas desde el esquema base.
grant insert on public.reporte_mensajes to authenticated;

-- Leer solo las columnas necesarias conserva el aislamiento de columnas del
-- reporte y hace operable el RPC bajo SECURITY INVOKER.
create or replace function public.registrar_mensaje_reporte(p_reporte_id uuid, p_mensaje text)
returns table(id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_estado text;
  v_admin boolean := public.es_administrador_activo();
  v_tipo text;
begin
  if auth.uid() is null then
    raise exception 'Sesión inválida.';
  end if;
  if p_mensaje is null or length(trim(p_mensaje)) not between 2 and 2000 then
    raise exception 'El mensaje debe tener entre 2 y 2000 caracteres.';
  end if;

  select r.estado
    into v_estado
    from public.reportes r
   where r.id = p_reporte_id
     and (v_admin or r.reportante_id = (select auth.uid()));

  if not found then
    raise exception 'No encontramos este reporte.';
  end if;
  if v_estado = 'cerrado' then
    raise exception 'Este reporte ya está cerrado.';
  end if;

  v_tipo := case when v_admin then 'administrador' else 'reportante' end;
  return query
    insert into public.reporte_mensajes (reporte_id, autor_id, autor_tipo, mensaje, visible_para_reportante)
    values (p_reporte_id, (select auth.uid()), v_tipo, trim(p_mensaje), true)
    returning reporte_mensajes.id;
end;
$$;

-- Cerrar es reversible y no siempre requiere documentar una resolución. La
-- nota sigue disponible como bitácora opcional.
create or replace function public.proteger_reporte_atencion()
returns trigger
language plpgsql
security definer
set search_path = public
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
  if new.asignado_a is not null and not exists (
    select 1 from public.administradores a where a.id = new.asignado_a and a.activo
  ) then
    raise exception 'La cuenta asignada no es un administrador activo.';
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
    and new.resolucion is not distinct from old.resolucion
    and new.respuesta_publica is not distinct from old.respuesta_publica
    and new.asignado_a is not distinct from old.asignado_a
    and new.fecha_limite is not distinct from old.fecha_limite then
    return new;
  end if;
  if new.asignado_a is distinct from old.asignado_a then
    new.asignado_en := case when new.asignado_a is null then null else clock_timestamp() end;
  else
    new.asignado_en := old.asignado_en;
  end if;
  if auth.uid() is not null then
    new.atendido_por := (select auth.uid());
  end if;
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

revoke execute on function public.registrar_mensaje_reporte(uuid, text) from public, anon;
grant execute on function public.registrar_mensaje_reporte(uuid, text) to authenticated;
revoke execute on function public.proteger_reporte_atencion() from public, anon, authenticated;

commit;
