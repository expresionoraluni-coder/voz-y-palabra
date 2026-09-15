-- La cláusula ON CONFLICT debe repetir por completo el predicado del índice
-- parcial de aperturas para que Postgres pueda usarlo como árbitro.
create or replace function public.guardar_apertura_actividad_docente(
  p_actividad_id uuid,
  p_fecha date,
  p_grupo_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_unidad_id uuid;
  v_titulo text;
begin
  if not public.es_docente_activo() then
    raise exception 'Se requiere una cuenta docente confirmada.';
  end if;
  if p_actividad_id is null or p_fecha is null then
    raise exception 'La actividad y su fecha de apertura son obligatorias.';
  end if;
  if coalesce(cardinality(p_grupo_ids), 0) = 0 then
    raise exception 'Selecciona al menos un grupo para abrir la actividad.';
  end if;
  if cardinality(p_grupo_ids) <> (select count(distinct id) from unnest(p_grupo_ids) as ids(id)) then
    raise exception 'La lista de grupos contiene duplicados.';
  end if;

  select a.unidad_id, a.titulo
    into v_unidad_id, v_titulo
    from public.actividades a
   where a.id = p_actividad_id;
  if not found then
    raise exception 'La actividad no existe.';
  end if;

  if exists (
    select 1
      from unnest(p_grupo_ids) as seleccion(grupo_id)
      left join public.grupos g
        on g.id = seleccion.grupo_id
       and g.docente_id = (select auth.uid())
     where g.id is null
  ) then
    raise exception 'Solo puedes programar la apertura para tus propios grupos.';
  end if;

  delete from public.eventos e
   where e.actividad_id = p_actividad_id
     and e.tipo = 'apertura_actividad'
     and e.docente_id = (select auth.uid())
     and e.grupo_id in (
       select g.id from public.grupos g where g.docente_id = (select auth.uid())
     )
     and not (e.grupo_id = any(p_grupo_ids));

  insert into public.eventos (
    docente_id, grupo_id, unidad_id, titulo, tipo, fecha, actividad_id
  )
  select (select auth.uid()), g.id, v_unidad_id, v_titulo, 'apertura_actividad', p_fecha, p_actividad_id
    from public.grupos g
   where g.id = any(p_grupo_ids)
     and g.docente_id = (select auth.uid())
  on conflict (grupo_id, actividad_id) where tipo = 'apertura_actividad' and actividad_id is not null
  do update set fecha = excluded.fecha, unidad_id = excluded.unidad_id, titulo = excluded.titulo;
end;
$$;
