-- Corrige la referencia ambigua a id en ingresar_estudiante().
-- La función devuelve una columna llamada id; por eso toda actualización de
-- estudiantes debe usar un alias explícito para no confundirse con el
-- parámetro de salida.

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
  if p_nip !~ '^[0-9]{4}$' then raise exception 'Tu NIP debe ser de 4 dígitos.'; end if;

  select g.id, g.nombre into v_grupo
    from public.grupos g
    where g.codigo_acceso = trim(p_codigo) and g.activo = true;
  if v_grupo.id is null then
    perform pg_sleep(0.5);
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos;
    return;
  end if;

  select * into v_intentos_nombre
    from public.intentos_nombre_estudiante
    where usuario_id = auth.uid();
  if v_intentos_nombre.bloqueado_hasta is not null and v_intentos_nombre.bloqueado_hasta > now() then
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean,
      format('Demasiados intentos. Espera %s minutos e intenta de nuevo.', greatest(1, ceil(extract(epoch from (v_intentos_nombre.bloqueado_hasta - now())) / 60)))::text;
    return;
  end if;

  select e.id, e.nombre, e.nip_hash, e.activo, e.intentos_fallidos, e.bloqueado_hasta into v_estudiante
    from public.estudiantes e
    where e.grupo_id = v_grupo.id and public.normalizar_nombre(e.nombre) = public.normalizar_nombre(p_nombre);
  if v_estudiante.id is null then
    insert into public.intentos_nombre_estudiante (usuario_id, intentos, bloqueado_hasta) values (auth.uid(), 1, null)
      on conflict (usuario_id) do update set intentos = public.intentos_nombre_estudiante.intentos + 1,
      bloqueado_hasta = case when public.intentos_nombre_estudiante.intentos + 1 >= v_max_intentos then now() + (v_minutos_bloqueo || ' minutes')::interval else public.intentos_nombre_estudiante.bloqueado_hasta end;
    insert into public.intentos_nombre_grupo as ing (grupo_id, intentos, ventana_inicio) values (v_grupo.id, 1, now())
      on conflict (grupo_id) do update set intentos = case when now() - ing.ventana_inicio > interval '5 minutes' then 1 else ing.intentos + 1 end,
      ventana_inicio = case when now() - ing.ventana_inicio > interval '5 minutes' then now() else ing.ventana_inicio end returning ing.intentos into v_intentos_grupo_actual;
    perform pg_sleep(least(0.3 + v_intentos_grupo_actual * 0.15, 2.5));
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos;
    return;
  end if;

  if not v_estudiante.activo then
    perform pg_sleep(0.5);
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos;
    return;
  end if;
  if v_estudiante.bloqueado_hasta is not null and v_estudiante.bloqueado_hasta > now() then
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean,
      format('Demasiados intentos. Espera %s minutos e intenta de nuevo.', greatest(1, ceil(extract(epoch from (v_estudiante.bloqueado_hasta - now())) / 60)))::text;
    return;
  end if;

  delete from public.intentos_nombre_estudiante where usuario_id = auth.uid();
  if v_estudiante.nip_hash is null then
    update public.estudiantes as e_ligado
      set auth_user_id = null
      where e_ligado.auth_user_id = auth.uid() and e_ligado.id <> v_estudiante.id;
    update public.estudiantes as e_actual
      set auth_user_id = auth.uid(), nip_hash = extensions.crypt(p_nip, extensions.gen_salt('bf')), intentos_fallidos = 0, bloqueado_hasta = null
      where e_actual.id = v_estudiante.id;
    return query select v_estudiante.id, v_estudiante.nombre, v_grupo.id, v_grupo.nombre, true, null::text;
    return;
  end if;
  if extensions.crypt(p_nip, v_estudiante.nip_hash) <> v_estudiante.nip_hash then
    update public.estudiantes as e_actual
      set intentos_fallidos = v_estudiante.intentos_fallidos + 1,
      bloqueado_hasta = case when v_estudiante.intentos_fallidos + 1 >= v_max_intentos then now() + (v_minutos_bloqueo || ' minutes')::interval else e_actual.bloqueado_hasta end
      where e_actual.id = v_estudiante.id;
    perform pg_sleep(0.5);
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos;
    return;
  end if;

  update public.estudiantes as e_ligado
    set auth_user_id = null
    where e_ligado.auth_user_id = auth.uid() and e_ligado.id <> v_estudiante.id;
  update public.estudiantes as e_actual
    set auth_user_id = auth.uid(), intentos_fallidos = 0, bloqueado_hasta = null
    where e_actual.id = v_estudiante.id;
  return query select v_estudiante.id, v_estudiante.nombre, v_grupo.id, v_grupo.nombre, false, null::text;
end;
$$;
