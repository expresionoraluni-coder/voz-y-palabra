-- Evita que los nombres de salida de la función hagan ambiguas las columnas
-- del catálogo al devolver las insignias del estudiante.
create or replace function public.verificar_insignias()
returns table(nombre text, descripcion text)
language plpgsql
security definer
set search_path = public
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
  if v_estudiante is null then raise exception 'No hay una sesión de estudiante válida'; end if;

  select count(*) into v_total_reflexiones
    from public.reflexiones
   where estudiante_id = v_estudiante and momento = 'cierre' and unidad_id is not null;
  select count(*) into v_total_actividades from public.actividades;
  select count(*) into v_total_hechas
    from public.entregas
   where estudiante_id = v_estudiante
     and (puntaje_auto is null or puntaje_auto >= 70 or respuesta -> '_meta' ->> 'intentos' = '3');
  select count(*) into v_unidades_con_ambas_confianzas
    from (
      select unidad_id
        from public.autoevaluaciones_confianza
       where estudiante_id = v_estudiante
       group by unidad_id
      having count(distinct momento) = 2
    ) x;

  if v_total_reflexiones >= 1 then
    insert into public.insignias_otorgadas (estudiante_id, insignia_id)
    select v_estudiante, i.id from public.insignias i where i.nombre = 'Primera reflexión' on conflict do nothing;
  end if;
  if v_total_reflexiones >= 3 then
    insert into public.insignias_otorgadas (estudiante_id, insignia_id)
    select v_estudiante, i.id from public.insignias i where i.nombre = 'Mente reflexiva' on conflict do nothing;
  end if;

  for v_orden, v_unidad_total, v_unidad_hechas in
    select u.orden,
           count(a.id),
           count(e.id) filter (where e.puntaje_auto is null or e.puntaje_auto >= 70 or e.respuesta -> '_meta' ->> 'intentos' = '3')
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

  if v_total_actividades > 0 and v_total_hechas = v_total_actividades then
    insert into public.insignias_otorgadas (estudiante_id, insignia_id)
    select v_estudiante, i.id from public.insignias i where i.nombre = 'Voz y Palabra completo' on conflict do nothing;
  end if;
  if v_unidades_con_ambas_confianzas >= 1 then
    insert into public.insignias_otorgadas (estudiante_id, insignia_id)
    select v_estudiante, i.id from public.insignias i where i.nombre = 'Autoconocimiento' on conflict do nothing;
  end if;

  return query
  select i.nombre as nombre, i.descripcion as descripcion
    from public.insignias_otorgadas io
    join public.insignias i on i.id = io.insignia_id
   where io.estudiante_id = v_estudiante
   order by io.created_at;
end;
$$;

revoke execute on function public.verificar_insignias() from public, anon;
grant execute on function public.verificar_insignias() to authenticated;
