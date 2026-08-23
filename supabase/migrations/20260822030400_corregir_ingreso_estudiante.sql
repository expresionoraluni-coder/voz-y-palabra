-- El nombre de salida grupo_id colisionaba con el objetivo de conflicto del
-- contador de grupo en PL/pgSQL. Usar la restricción explícita conserva el
-- límite y evita el error de columna ambigua al iniciar sesión.
create or replace function public.ingresar_estudiante(p_codigo text, p_nombre text, p_nip text)
returns table(id uuid, nombre text, grupo_id uuid, grupo_nombre text, nip_nuevo boolean, error text)
language plpgsql security definer set search_path = public, extensions
as $$
declare v_grupo record; v_estudiante record; v_intentos_nombre record; v_intentos_grupo int;
  v_error_datos constant text := 'No pudimos validar tus datos. Revisa el código, tu nombre y tu NIP.';
  v_max_intentos constant int := 5; v_minutos_bloqueo constant int := 15;
begin
  if auth.uid() is null then raise exception 'Sesión inválida, intenta de nuevo'; end if;
  if coalesce(auth.jwt() ->> 'is_anonymous', 'false') <> 'true' then
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
  if v_grupo.id is null then perform pg_sleep(0.2); return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return; end if;
  insert into public.intentos_nombre_grupo (grupo_id, intentos, ventana_inicio)
    values (v_grupo.id, 1, now())
    on conflict on constraint intentos_nombre_grupo_pkey do update set
      intentos = case when public.intentos_nombre_grupo.ventana_inicio < now() - interval '5 minutes' then 1 else public.intentos_nombre_grupo.intentos + 1 end,
      ventana_inicio = case when public.intentos_nombre_grupo.ventana_inicio < now() - interval '5 minutes' then now() else public.intentos_nombre_grupo.ventana_inicio end
    returning intentos into v_intentos_grupo;
  if v_intentos_grupo > 180 then
    perform pg_sleep(0.2);
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, 'Demasiadas solicitudes para este grupo. Intenta de nuevo en unos minutos.'::text;
    return;
  end if;
  delete from public.intentos_nombre_estudiante where actualizado_en < now() - interval '1 day';
  select * into v_intentos_nombre from public.intentos_nombre_estudiante where usuario_id = auth.uid();
  if v_intentos_nombre.bloqueado_hasta is not null and v_intentos_nombre.bloqueado_hasta > now() then
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, format('Demasiados intentos. Espera %s minutos e intenta de nuevo.', greatest(1, ceil(extract(epoch from (v_intentos_nombre.bloqueado_hasta - now())) / 60)))::text; return;
  end if;
  select e.id, e.nombre, e.boleta, e.nip_hash, e.activo, e.auth_user_id, e.debe_cambiar_nip,
         e.intentos_fallidos, e.bloqueado_hasta into v_estudiante
    from public.estudiantes e where e.grupo_id = v_grupo.id and public.normalizar_nombre(e.nombre) = public.normalizar_nombre(p_nombre)
    for update;
  if v_estudiante.id is null then
    insert into public.intentos_nombre_estudiante (usuario_id, intentos, bloqueado_hasta, actualizado_en) values (auth.uid(), 1, null, now())
      on conflict (usuario_id) do update set
        intentos = case when public.intentos_nombre_estudiante.actualizado_en < now() - interval '1 day' then 1 else public.intentos_nombre_estudiante.intentos + 1 end,
        bloqueado_hasta = case when (case when public.intentos_nombre_estudiante.actualizado_en < now() - interval '1 day' then 1 else public.intentos_nombre_estudiante.intentos + 1 end) >= v_max_intentos then now() + (v_minutos_bloqueo || ' minutes')::interval else public.intentos_nombre_estudiante.bloqueado_hasta end,
        actualizado_en = now();
    perform pg_sleep(0.2);
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return;
  end if;
  if not v_estudiante.activo then perform pg_sleep(0.2); return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return; end if;
  if v_estudiante.bloqueado_hasta is not null and v_estudiante.bloqueado_hasta > now() then
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, format('Demasiados intentos. Espera %s minutos e intenta de nuevo.', greatest(1, ceil(extract(epoch from (v_estudiante.bloqueado_hasta - now())) / 60)))::text; return;
  end if;
  delete from public.intentos_nombre_estudiante where usuario_id = auth.uid();
  if v_estudiante.nip_hash is null then
    if v_estudiante.boleta is null or right(regexp_replace(v_estudiante.boleta, '\D', '', 'g'), 4) <> p_nip then
      perform pg_sleep(0.2);
      return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return;
    end if;
    if v_estudiante.auth_user_id is not null and v_estudiante.auth_user_id <> auth.uid() then
      perform pg_sleep(0.2);
      return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return;
    end if;
    update public.estudiantes set auth_user_id = null where auth_user_id = auth.uid() and public.estudiantes.id <> v_estudiante.id;
    update public.estudiantes set auth_user_id = auth.uid(), nip_hash = extensions.crypt(p_nip, extensions.gen_salt('bf')), intentos_fallidos = 0, bloqueado_hasta = null where public.estudiantes.id = v_estudiante.id;
    return query select v_estudiante.id, v_estudiante.nombre, v_grupo.id, v_grupo.nombre, true, null::text; return;
  end if;
  if extensions.crypt(p_nip, v_estudiante.nip_hash) <> v_estudiante.nip_hash then
    update public.estudiantes set intentos_fallidos = v_estudiante.intentos_fallidos + 1, bloqueado_hasta = case when v_estudiante.intentos_fallidos + 1 >= v_max_intentos then now() + (v_minutos_bloqueo || ' minutes')::interval else bloqueado_hasta end where public.estudiantes.id = v_estudiante.id;
    perform pg_sleep(0.2);
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return;
  end if;
  if v_estudiante.debe_cambiar_nip and v_estudiante.auth_user_id is not null and v_estudiante.auth_user_id <> auth.uid() then
    perform pg_sleep(0.2);
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return;
  end if;
  update public.estudiantes set auth_user_id = null where auth_user_id = auth.uid() and public.estudiantes.id <> v_estudiante.id;
  update public.estudiantes set auth_user_id = auth.uid(), intentos_fallidos = 0, bloqueado_hasta = null where public.estudiantes.id = v_estudiante.id;
  return query select v_estudiante.id, v_estudiante.nombre, v_grupo.id, v_grupo.nombre, false, null::text;
end;
$$;
