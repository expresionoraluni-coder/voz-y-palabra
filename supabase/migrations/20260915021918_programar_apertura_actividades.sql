-- Programa la apertura de cada actividad por grupo usando el calendario.
-- Los eventos existentes permanecen intactos y conservan actividad_id = NULL.
create unique index if not exists actividades_id_unidad_unique
  on public.actividades (id, unidad_id);

alter table public.eventos
  add column if not exists actividad_id uuid;

alter table public.eventos
  drop constraint if exists eventos_tipo_check;

alter table public.eventos
  add constraint eventos_tipo_check
  check (tipo in ('examen', 'proyecto', 'entrega', 'apertura_actividad', 'otro'));

alter table public.eventos
  drop constraint if exists eventos_apertura_actividad_coincide_unidad;

alter table public.eventos
  add constraint eventos_apertura_actividad_coincide_unidad
  foreign key (actividad_id, unidad_id)
  references public.actividades (id, unidad_id)
  on delete cascade;

alter table public.eventos
  drop constraint if exists eventos_apertura_actividad_tipo_check;

alter table public.eventos
  add constraint eventos_apertura_actividad_tipo_check
  check ((tipo = 'apertura_actividad') = (actividad_id is not null));

create unique index if not exists eventos_apertura_actividad_grupo_unique
  on public.eventos (grupo_id, actividad_id)
  where tipo = 'apertura_actividad' and actividad_id is not null;

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
  do update set fecha = excluded.fecha;
end;
$$;

create or replace function public.crear_actividad_programada_docente(
  p_unidad_id uuid,
  p_tipo_id uuid,
  p_titulo text,
  p_instrucciones text,
  p_aprendizaje_esperado text,
  p_video_url text,
  p_contenido jsonb,
  p_fecha_apertura date,
  p_grupo_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actividad_id uuid;
begin
  v_actividad_id := public.crear_actividad_docente(
    p_unidad_id,
    p_tipo_id,
    p_titulo,
    p_instrucciones,
    p_aprendizaje_esperado,
    p_video_url,
    p_contenido
  );
  perform public.guardar_apertura_actividad_docente(v_actividad_id, p_fecha_apertura, p_grupo_ids);
  return v_actividad_id;
end;
$$;

revoke all on function public.guardar_apertura_actividad_docente(uuid, date, uuid[]) from public, anon;
grant execute on function public.guardar_apertura_actividad_docente(uuid, date, uuid[]) to authenticated;
revoke all on function public.crear_actividad_programada_docente(uuid, uuid, text, text, text, text, jsonb, date, uuid[]) from public, anon;
grant execute on function public.crear_actividad_programada_docente(uuid, uuid, text, text, text, text, jsonb, date, uuid[]) to authenticated;
