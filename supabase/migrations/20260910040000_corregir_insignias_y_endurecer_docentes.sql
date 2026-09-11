-- Corrige el nombre real de la columna de actividad, alinea las funciones
-- sensibles con los snapshots y elimina grants DML heredados del perfil docente.

create or replace function public.verificar_insignias()
returns table(nombre text, descripcion text)
language plpgsql security definer set search_path = public
as $$
declare
  v_estudiante uuid := public.estudiante_actual();
  v_total_reflexiones int;
  v_total_actividades int;
  v_total_hechas int;
  v_unidades_con_ambas_confianzas int;
  v_orden int;
  v_unidad_total int;
  v_unidad_hechas int;
begin
  if v_estudiante is null then
    raise exception 'No hay una sesión de estudiante válida';
  end if;

  with unidades_completas as (
    select u.id
      from public.unidades u
      join public.actividades a on a.unidad_id = u.id
      left join public.entregas e on e.actividad_id = a.id and e.estudiante_id = v_estudiante
     group by u.id
    having count(distinct a.id) > 0
       and count(distinct a.id) filter (
         where e.id is not null
           and public.entrega_cuenta_como_completada(a.contenido, e.puntaje_auto, e.respuesta)
       ) = count(distinct a.id)
  )
  select count(distinct r.unidad_id)
    into v_total_reflexiones
    from public.reflexiones r
   where r.estudiante_id = v_estudiante
     and r.momento = 'cierre'
     and r.unidad_id is not null
     and exists (select 1 from unidades_completas uc where uc.id = r.unidad_id);

  select count(*) into v_total_actividades from public.actividades;

  select count(distinct e.actividad_id)
    into v_total_hechas
    from public.entregas e
    join public.actividades a on a.id = e.actividad_id
   where e.estudiante_id = v_estudiante
     and public.entrega_cuenta_como_completada(a.contenido, e.puntaje_auto, e.respuesta);

  with unidades_completas as (
    select u.id
      from public.unidades u
      join public.actividades a on a.unidad_id = u.id
      left join public.entregas e on e.actividad_id = a.id and e.estudiante_id = v_estudiante
     group by u.id
    having count(distinct a.id) > 0
       and count(distinct a.id) filter (
         where e.id is not null
           and public.entrega_cuenta_como_completada(a.contenido, e.puntaje_auto, e.respuesta)
       ) = count(distinct a.id)
  )
  select count(*)
    into v_unidades_con_ambas_confianzas
    from (
      select ac.unidad_id
        from public.autoevaluaciones_confianza ac
        join unidades_completas uc on uc.id = ac.unidad_id
       where ac.estudiante_id = v_estudiante
       group by ac.unidad_id
      having count(*) filter (where ac.momento = 'inicio') > 0
         and count(*) filter (where ac.momento = 'cierre') > 0
    ) x;

  if v_total_reflexiones >= 1 then
    insert into public.insignias_otorgadas (estudiante_id, insignia_id)
    select v_estudiante, i.id from public.insignias i
     where i.nombre = 'Primera reflexión'
    on conflict do nothing;
  end if;
  if v_total_reflexiones >= 3 then
    insert into public.insignias_otorgadas (estudiante_id, insignia_id)
    select v_estudiante, i.id from public.insignias i
     where i.nombre = 'Mente reflexiva'
    on conflict do nothing;
  end if;

  for v_orden, v_unidad_total, v_unidad_hechas in
    select u.orden,
           count(a.id),
           count(distinct e.actividad_id) filter (
             where public.entrega_cuenta_como_completada(a.contenido, e.puntaje_auto, e.respuesta)
           )
      from public.unidades u
      left join public.actividades a on a.unidad_id = u.id
      left join public.entregas e on e.actividad_id = a.id and e.estudiante_id = v_estudiante
     group by u.id, u.orden
  loop
    if v_unidad_total > 0 and v_unidad_hechas = v_unidad_total then
      insert into public.insignias_otorgadas (estudiante_id, insignia_id)
      select v_estudiante, i.id from public.insignias i
       where i.nombre = 'Unidad ' || v_orden || ' completa'
      on conflict do nothing;
    end if;
  end loop;

  if v_total_actividades > 0 and v_total_hechas = v_total_actividades then
    insert into public.insignias_otorgadas (estudiante_id, insignia_id)
    select v_estudiante, i.id from public.insignias i
     where i.nombre = 'Voz y Palabra completo'
    on conflict do nothing;
  end if;
  if v_unidades_con_ambas_confianzas >= 1 then
    insert into public.insignias_otorgadas (estudiante_id, insignia_id)
    select v_estudiante, i.id from public.insignias i
     where i.nombre = 'Autoconocimiento'
    on conflict do nothing;
  end if;

  return query
  select i.nombre, i.descripcion
    from public.insignias_otorgadas io
    join public.insignias i on i.id = io.insignia_id
   where io.estudiante_id = v_estudiante
   order by io.created_at;
end;
$$;

revoke execute on function public.verificar_insignias() from public, anon;
grant execute on function public.verificar_insignias() to authenticated;

-- Defensa en profundidad: el RPC valida la cuenta docente y RLS valida las
-- filas; el bloqueo solo debe afectar a la entrega que se actualiza.
create or replace function public.registrar_orientacion_docente(
  p_entrega_id uuid,
  p_comentario text,
  p_estado_apoyo text,
  p_marcar_atendida boolean
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_estado_entrega text;
begin
  if auth.uid() is null then
    raise exception 'Tu sesión expiró. Entra de nuevo para continuar.';
  end if;
  if not public.es_docente_activo() then
    raise exception 'Se requiere una cuenta docente confirmada.';
  end if;
  if p_estado_apoyo is not null
     and p_estado_apoyo not in ('logrado', 'en_proceso', 'necesita_apoyo') then
    raise exception 'La señal de apoyo no es válida.';
  end if;
  if length(coalesce(p_comentario, '')) > 2000 then
    raise exception 'La orientación no puede superar 2000 caracteres.';
  end if;

  select en.estado
    into v_estado_entrega
    from public.entregas en
    join public.estudiantes e on e.id = en.estudiante_id
    join public.grupos g on g.id = e.grupo_id
   where en.id = p_entrega_id
     and g.docente_id = auth.uid()
   for update of en;

  if not found then
    raise exception 'No tienes permiso para acompañar esta entrega.';
  end if;

  if btrim(coalesce(p_comentario, '')) <> '' then
    insert into public.retroalimentacion_docente (entrega_id, docente_id, comentario)
    values (p_entrega_id, auth.uid(), btrim(p_comentario));
  end if;

  update public.entregas
     set evaluacion_docente = p_estado_apoyo,
         estado = case
           when coalesce(p_marcar_atendida, false)
                and v_estado_entrega = 'pendiente_revision' then 'revisada'
           else estado
         end
   where id = p_entrega_id;
end;
$$;

revoke execute on function public.registrar_orientacion_docente(uuid, text, text, boolean) from public, anon;
grant execute on function public.registrar_orientacion_docente(uuid, text, text, boolean) to authenticated;

-- La variante alternativa no cambia la actividad después de una entrega;
-- solo se permiten reparar las instrucciones y URLs que no alteran respuestas.
create or replace function public.proteger_actividad_con_entregas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
       new.tipo_id is distinct from old.tipo_id
       or (
         ((new.contenido - 'instrucciones_momentos' - 'reintento_alternativo') #- '{video_bien,url}') #- '{video_mal,url}'
       ) is distinct from (
         ((old.contenido - 'instrucciones_momentos' - 'reintento_alternativo') #- '{video_bien,url}') #- '{video_mal,url}'
       )
     )
     and exists (select 1 from public.entregas where actividad_id = old.id) then
    raise exception 'Esta actividad ya tiene entregas y su tipo o contenido no se puede modificar.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_actividad_con_entregas on public.actividades;
create trigger trg_proteger_actividad_con_entregas
before update on public.actividades
for each row execute function public.proteger_actividad_con_entregas();

revoke all on public.docentes from public, anon, authenticated;
grant select (id, nombre, created_at) on public.docentes to authenticated;
grant all on public.docentes to service_role;
