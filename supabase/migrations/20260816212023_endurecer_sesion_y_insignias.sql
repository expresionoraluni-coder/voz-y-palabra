-- La función de ingreso solo puede ser usada por la sesión anónima que la UI
-- crea para un estudiante. La comprobación vive en la base de datos, no solo
-- en el cliente.
create or replace function public.ingresar_estudiante(p_codigo text, p_nombre text, p_nip text)
returns table(id uuid, nombre text, grupo_id uuid, grupo_nombre text, nip_nuevo boolean, error text)
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_grupo record;
  v_estudiante record;
  v_intentos_nombre record;
  v_intentos_grupo_actual int;
  v_error_datos constant text := 'No pudimos validar tus datos. Revisa el código, tu nombre y tu NIP.';
  v_max_intentos constant int := 5;
  v_minutos_bloqueo constant int := 15;
begin
  if auth.uid() is null then raise exception 'Sesión inválida, intenta de nuevo'; end if;
  if auth.jwt() ->> 'is_anonymous' <> 'true' then
    raise exception 'Este acceso requiere una sesión de estudiante.';
  end if;
  if length(trim(coalesce(p_codigo, ''))) < 4 or length(trim(coalesce(p_codigo, ''))) > 64 then
    raise exception 'El código de grupo no es válido.';
  end if;
  if p_nombre is null or length(trim(p_nombre)) = 0 or length(p_nombre) > 200 then
    raise exception 'Escribe tu nombre completo.';
  end if;
  if coalesce(p_nip, '') !~ '^[0-9]{4}$' then raise exception 'Tu NIP debe ser de 4 dígitos.'; end if;
  select g.id, g.nombre into v_grupo from public.grupos g where g.codigo_acceso = trim(p_codigo) and g.activo = true;
  if v_grupo.id is null then perform pg_sleep(0.5); return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return; end if;
  select * into v_intentos_nombre from public.intentos_nombre_estudiante where usuario_id = auth.uid();
  if v_intentos_nombre.bloqueado_hasta is not null and v_intentos_nombre.bloqueado_hasta > now() then
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, format('Demasiados intentos. Espera %s minutos e intenta de nuevo.', greatest(1, ceil(extract(epoch from (v_intentos_nombre.bloqueado_hasta - now())) / 60)))::text; return;
  end if;
  select e.id, e.nombre, e.nip_hash, e.activo, e.intentos_fallidos, e.bloqueado_hasta into v_estudiante
    from public.estudiantes e where e.grupo_id = v_grupo.id and public.normalizar_nombre(e.nombre) = public.normalizar_nombre(p_nombre)
    for update;
  if v_estudiante.id is null then
    insert into public.intentos_nombre_estudiante (usuario_id, intentos, bloqueado_hasta) values (auth.uid(), 1, null)
      on conflict (usuario_id) do update set intentos = public.intentos_nombre_estudiante.intentos + 1,
      bloqueado_hasta = case when public.intentos_nombre_estudiante.intentos + 1 >= v_max_intentos then now() + (v_minutos_bloqueo || ' minutes')::interval else public.intentos_nombre_estudiante.bloqueado_hasta end;
    insert into public.intentos_nombre_grupo as ing (grupo_id, intentos, ventana_inicio) values (v_grupo.id, 1, now())
      on conflict (grupo_id) do update set intentos = case when now() - ing.ventana_inicio > interval '5 minutes' then 1 else ing.intentos + 1 end,
      ventana_inicio = case when now() - ing.ventana_inicio > interval '5 minutes' then now() else ing.ventana_inicio end returning ing.intentos into v_intentos_grupo_actual;
    perform pg_sleep(least(0.3 + v_intentos_grupo_actual * 0.15, 2.5));
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return;
  end if;
  if not v_estudiante.activo then perform pg_sleep(0.5); return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return; end if;
  if v_estudiante.bloqueado_hasta is not null and v_estudiante.bloqueado_hasta > now() then
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, format('Demasiados intentos. Espera %s minutos e intenta de nuevo.', greatest(1, ceil(extract(epoch from (v_estudiante.bloqueado_hasta - now())) / 60)))::text; return;
  end if;
  delete from public.intentos_nombre_estudiante where usuario_id = auth.uid();
  if v_estudiante.nip_hash is null then
    update public.estudiantes set auth_user_id = null where auth_user_id = auth.uid() and public.estudiantes.id <> v_estudiante.id;
    update public.estudiantes set auth_user_id = auth.uid(), nip_hash = extensions.crypt(p_nip, extensions.gen_salt('bf')), intentos_fallidos = 0, bloqueado_hasta = null where public.estudiantes.id = v_estudiante.id;
    return query select v_estudiante.id, v_estudiante.nombre, v_grupo.id, v_grupo.nombre, true, null::text; return;
  end if;
  if extensions.crypt(p_nip, v_estudiante.nip_hash) <> v_estudiante.nip_hash then
    update public.estudiantes set intentos_fallidos = v_estudiante.intentos_fallidos + 1, bloqueado_hasta = case when v_estudiante.intentos_fallidos + 1 >= v_max_intentos then now() + (v_minutos_bloqueo || ' minutes')::interval else bloqueado_hasta end where public.estudiantes.id = v_estudiante.id;
    perform pg_sleep(0.5); return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return;
  end if;
  update public.estudiantes set auth_user_id = null where auth_user_id = auth.uid() and public.estudiantes.id <> v_estudiante.id;
  update public.estudiantes set auth_user_id = auth.uid(), intentos_fallidos = 0, bloqueado_hasta = null where public.estudiantes.id = v_estudiante.id;
  return query select v_estudiante.id, v_estudiante.nombre, v_grupo.id, v_grupo.nombre, false, null::text;
end;
$$;

-- Las insignias de reflexión y autoconocimiento solo se calculan después de
-- una unidad realmente terminada, no por filas insertadas directamente.
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
  if v_estudiante is null then raise exception 'No hay una sesión de estudiante válida'; end if;
  with unidades_completas as (
    select u.id
      from public.unidades u
      join public.actividades a on a.unidad_id = u.id
      left join public.entregas e on e.actividad_id = a.id and e.estudiante_id = v_estudiante
     group by u.id
    having count(distinct a.id) > 0
       and count(distinct a.id) filter (where e.id is not null and (e.puntaje_auto is null or e.puntaje_auto >= 70 or e.respuesta -> '_meta' ->> 'intentos' = '3')) = count(distinct a.id)
  )
  select count(*) into v_total_reflexiones
    from public.reflexiones r
   where r.estudiante_id = v_estudiante and r.momento = 'cierre' and r.unidad_id is not null
     and exists (select 1 from unidades_completas uc where uc.id = r.unidad_id);
  select count(*) into v_total_actividades from public.actividades;
  select count(*) into v_total_hechas
    from public.entregas
   where estudiante_id = v_estudiante
     and (puntaje_auto is null or puntaje_auto >= 70 or respuesta -> '_meta' ->> 'intentos' = '3');
  with unidades_completas as (
    select u.id
      from public.unidades u
      join public.actividades a on a.unidad_id = u.id
      left join public.entregas e on e.actividad_id = a.id and e.estudiante_id = v_estudiante
     group by u.id
    having count(distinct a.id) > 0
       and count(distinct a.id) filter (where e.id is not null and (e.puntaje_auto is null or e.puntaje_auto >= 70 or e.respuesta -> '_meta' ->> 'intentos' = '3')) = count(distinct a.id)
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
    select u.orden, count(a.id), count(e.id) filter (where e.puntaje_auto is null or e.puntaje_auto >= 70 or e.respuesta -> '_meta' ->> 'intentos' = '3')
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
  select i.nombre, i.descripcion
    from public.insignias_otorgadas io
    join public.insignias i on i.id = io.insignia_id
   where io.estudiante_id = v_estudiante
   order by io.created_at;
end;
$$;

revoke execute on function public.ingresar_estudiante(text, text, text) from public, anon;
grant execute on function public.ingresar_estudiante(text, text, text) to authenticated;
revoke execute on function public.verificar_insignias() from public, anon;
grant execute on function public.verificar_insignias() to authenticated;
