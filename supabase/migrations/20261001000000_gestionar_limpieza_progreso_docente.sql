-- Limpieza acotada del progreso docente.
-- No elimina actividades ni eventos de apertura. El respaldo queda en private
-- y la operación completa ocurre dentro de una sola transacción.

create schema if not exists private;
grant usage on schema private to service_role;

create table if not exists private.limpiezas_progreso_docente (
  id uuid primary key default gen_random_uuid(),
  docente_id uuid not null,
  grupo_id uuid not null,
  estudiante_id uuid,
  actividad_ids uuid[] not null,
  conteos jsonb not null,
  respaldo jsonb not null,
  created_at timestamptz not null default now()
);

revoke all on private.limpiezas_progreso_docente from public, anon, authenticated;
grant all on private.limpiezas_progreso_docente to service_role;

create or replace function public.limpiar_progreso_actividad_docente(
  p_docente_id uuid,
  p_grupo_id uuid,
  p_actividad_ids uuid[],
  p_estudiante_id uuid default null,
  p_conteo_entregas integer default 0,
  p_conteo_reflexiones integer default 0,
  p_conteo_retroalimentaciones integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  v_operacion_id uuid := gen_random_uuid();
  v_actividad_ids uuid[];
  v_entrega_ids uuid[];
  v_entregas jsonb;
  v_reflexiones jsonb;
  v_retroalimentaciones jsonb;
  v_conteo_entregas integer;
  v_conteo_reflexiones integer;
  v_conteo_retroalimentaciones integer;
  v_eliminadas_entregas integer := 0;
  v_eliminadas_reflexiones integer := 0;
begin
  if p_docente_id is null or p_grupo_id is null then
    raise exception 'La operación no tiene un propietario válido.' using errcode = '22023';
  end if;

  if coalesce(cardinality(p_actividad_ids), 0) = 0 then
    raise exception 'Debes seleccionar al menos una actividad.' using errcode = '22023';
  end if;

  if cardinality(p_actividad_ids) > 100 then
    raise exception 'La selección de actividades es demasiado grande.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from grupos
    where id = p_grupo_id
      and docente_id = p_docente_id
  ) then
    raise exception 'El docente no tiene permiso sobre este grupo.' using errcode = '42501';
  end if;

  if p_estudiante_id is not null and not exists (
    select 1
    from estudiantes
    where id = p_estudiante_id
      and grupo_id = p_grupo_id
  ) then
    raise exception 'El estudiante no pertenece al grupo seleccionado.' using errcode = '42501';
  end if;

  select array_agg(distinct ids.actividad_id order by ids.actividad_id)
    into v_actividad_ids
  from unnest(p_actividad_ids) as ids(actividad_id);

  if (
    select count(*)
    from actividades
    where id = any(v_actividad_ids)
  ) <> cardinality(v_actividad_ids) then
    raise exception 'Una o más actividades no son válidas.' using errcode = '22023';
  end if;

  -- Se cuentan y respaldan exactamente las mismas filas que se eliminarán.
  -- Las reflexiones con unidad_id y sin actividad_id quedan intactas.
  select coalesce(array_agg(e.id order by e.id), '{}'::uuid[])
    into v_entrega_ids
  from entregas e
  join estudiantes s on s.id = e.estudiante_id
  where s.grupo_id = p_grupo_id
    and (p_estudiante_id is null or s.id = p_estudiante_id)
    and e.actividad_id = any(v_actividad_ids);

  select count(*) into v_conteo_entregas from unnest(v_entrega_ids);

  select count(*)
    into v_conteo_reflexiones
  from reflexiones r
  join estudiantes s on s.id = r.estudiante_id
  where s.grupo_id = p_grupo_id
    and (p_estudiante_id is null or s.id = p_estudiante_id)
    and r.actividad_id = any(v_actividad_ids);

  select count(*)
    into v_conteo_retroalimentaciones
  from retroalimentacion_docente rd
  where rd.entrega_id = any(v_entrega_ids);

  if v_conteo_entregas <> coalesce(p_conteo_entregas, 0)
     or v_conteo_reflexiones <> coalesce(p_conteo_reflexiones, 0)
     or v_conteo_retroalimentaciones <> coalesce(p_conteo_retroalimentaciones, 0) then
    raise exception 'Los datos cambiaron desde la vista previa. Vuelve a revisar antes de confirmar.' using errcode = '40001';
  end if;

  select coalesce(jsonb_agg(to_jsonb(e) order by e.id), '[]'::jsonb)
    into v_entregas
  from entregas e
  where e.id = any(v_entrega_ids);

  select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb)
    into v_reflexiones
  from reflexiones r
  join estudiantes s on s.id = r.estudiante_id
  where s.grupo_id = p_grupo_id
    and (p_estudiante_id is null or s.id = p_estudiante_id)
    and r.actividad_id = any(v_actividad_ids);

  select coalesce(jsonb_agg(to_jsonb(rd) order by rd.id), '[]'::jsonb)
    into v_retroalimentaciones
  from retroalimentacion_docente rd
  where rd.entrega_id = any(v_entrega_ids);

  insert into private.limpiezas_progreso_docente (
    id,
    docente_id,
    grupo_id,
    estudiante_id,
    actividad_ids,
    conteos,
    respaldo
  ) values (
    v_operacion_id,
    p_docente_id,
    p_grupo_id,
    p_estudiante_id,
    v_actividad_ids,
    jsonb_build_object(
      'entregas', v_conteo_entregas,
      'reflexiones', v_conteo_reflexiones,
      'retroalimentaciones', v_conteo_retroalimentaciones
    ),
    jsonb_build_object(
      'entregas', v_entregas,
      'reflexiones', v_reflexiones,
      'retroalimentaciones', v_retroalimentaciones
    )
  );

  delete from reflexiones r
  using estudiantes s
  where r.estudiante_id = s.id
    and s.grupo_id = p_grupo_id
    and (p_estudiante_id is null or s.id = p_estudiante_id)
    and r.actividad_id = any(v_actividad_ids);
  get diagnostics v_eliminadas_reflexiones = row_count;

  delete from entregas
  where id = any(v_entrega_ids);
  get diagnostics v_eliminadas_entregas = row_count;

  return jsonb_build_object(
    'operacion_id', v_operacion_id,
    'entregas', v_eliminadas_entregas,
    'reflexiones', v_eliminadas_reflexiones,
    'retroalimentaciones', v_conteo_retroalimentaciones
  );
end;
$$;

revoke all on function public.limpiar_progreso_actividad_docente(uuid, uuid, uuid[], uuid, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.limpiar_progreso_actividad_docente(uuid, uuid, uuid[], uuid, integer, integer, integer) to service_role;
