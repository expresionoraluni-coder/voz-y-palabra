-- Una entrega cuenta como completada con la misma regla que usa el avance
-- del estudiante; la operación es idempotente y no borra insignias existentes.
create or replace function public.entrega_cuenta_como_completada(
  p_contenido jsonb,
  p_puntaje_auto integer,
  p_respuesta jsonb
)
returns boolean
language sql immutable
set search_path = public
as $$
  select (
    (p_contenido -> 'reintento_alternativo') is null
    or p_puntaje_auto is null
    or p_puntaje_auto >= 70
    or coalesce((p_respuesta -> '_meta' ->> 'intentos') ~ '^[2-9][0-9]*$', false)
  );
$$;

create or replace function public.verificar_insignias()
returns table(nombre text, descripcion text)
language plpgsql security definer set search_path = public
as $$
declare v_estudiante uuid := public.estudiante_actual(); v_total_reflexiones int; v_total_actividades int; v_total_hechas int; v_unidades_con_ambas_confianzas int; v_orden int; v_unidad_total int; v_unidad_hechas int;
begin
  if v_estudiante is null then raise exception 'No hay una sesión de estudiante válida'; end if;
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
  select count(distinct r.unidad_id) into v_total_reflexiones
    from public.reflexiones r
   where r.estudiante_id = v_estudiante
     and r.momento = 'cierre'
     and r.unidad_id is not null
     and exists (select 1 from unidades_completas uc where uc.id = r.unidad_id);
  select count(*) into v_total_actividades from public.actividades;
  select count(distinct e.activity_id) into v_total_hechas
    from public.entregas e
    join public.actividades a on a.id = e.activity_id
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
  select count(*) into v_unidades_con_ambas_confianzas
    from (
      select ac.unidad_id
        from public.autoevaluaciones_confianza ac
        join unidades_completas uc on uc.id = ac.unidad_id
       where ac.estudiante_id = v_estudiante
       group by ac.unidad_id
      having count(*) filter (where ac.momento = 'inicio') > 0
         and count(*) filter (where ac.momento = 'cierre') > 0
    ) x;
  if v_total_reflexiones >= 1 then insert into public.insignias_otorgadas (estudiante_id, insignia_id) select v_estudiante, i.id from public.insignias i where i.nombre = 'Primera reflexión' on conflict do nothing; end if;
  if v_total_reflexiones >= 3 then insert into public.insignias_otorgadas (estudiante_id, insignia_id) select v_estudiante, i.id from public.insignias i where i.nombre = 'Mente reflexiva' on conflict do nothing; end if;
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
      select v_estudiante, i.id from public.insignias i where i.nombre = 'Unidad ' || v_orden || ' completa' on conflict do nothing;
    end if;
  end loop;
  if v_total_actividades > 0 and v_total_hechas = v_total_actividades then insert into public.insignias_otorgadas (estudiante_id, insignia_id) select v_estudiante, i.id from public.insignias i where i.nombre = 'Voz y Palabra completo' on conflict do nothing; end if;
  if v_unidades_con_ambas_confianzas >= 1 then insert into public.insignias_otorgadas (estudiante_id, insignia_id) select v_estudiante, i.id from public.insignias i where i.nombre = 'Autoconocimiento' on conflict do nothing; end if;
return query
select i.nombre as nombre, i.descripcion as descripcion
  from public.insignias_otorgadas io
  join public.insignias i on i.id = io.insignia_id
 where io.estudiante_id = v_estudiante
 order by io.created_at;
end;
$$;
revoke execute on function public.entrega_cuenta_como_completada(jsonb, integer, jsonb) from public, anon, authenticated;
revoke execute on function public.verificar_insignias() from public, anon;
grant execute on function public.verificar_insignias() to authenticated;
