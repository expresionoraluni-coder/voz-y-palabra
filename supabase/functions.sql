-- Funciones de aplicación necesarias para reconstruir Voz y Palabra.
-- Ejecutar después de schema.sql. No contiene datos ni claves.

create or replace function public.normalizar_nombre(p_nombre text)
returns text language sql immutable set search_path = public, extensions
as $$ select upper(trim(regexp_replace(extensions.unaccent(coalesce(p_nombre, '')), '\s+', ' ', 'g'))) $$;

create or replace function public.grupo_del_estudiante_actual()
returns uuid language sql stable security definer set search_path = public
as $$ select grupo_id from public.estudiantes where auth_user_id = auth.uid() and activo = true $$;

create or replace function public.estudiante_tiene_nip(p_codigo text, p_nombre text)
returns boolean language sql security definer set search_path = public
as $$
  select coalesce((select e.nip_hash is not null from public.estudiantes e join public.grupos g on g.id = e.grupo_id
    where g.codigo_acceso = trim(p_codigo) and g.activo = true and lower(trim(e.nombre)) = lower(trim(p_nombre)) and e.activo = true limit 1), false)
$$;

create or replace function public.ingresar_estudiante(p_codigo text, p_nombre text, p_nip text)
returns table(id uuid, nombre text, grupo_id uuid, grupo_nombre text, nip_nuevo boolean, error text)
language plpgsql security definer set search_path = public, extensions
as $$
declare v_grupo record; v_estudiante record; v_intentos_nombre record; v_intentos_grupo_actual int;
  v_error_datos constant text := 'No pudimos validar tus datos. Revisa el código, tu nombre y tu NIP.';
  v_max_intentos constant int := 5; v_minutos_bloqueo constant int := 15;
begin
  if auth.uid() is null then raise exception 'Sesión inválida, intenta de nuevo'; end if;
  if p_nip !~ '^[0-9]{4}$' then raise exception 'Tu NIP debe ser de 4 dígitos.'; end if;
  select g.id, g.nombre into v_grupo from public.grupos g where g.codigo_acceso = trim(p_codigo) and g.activo = true;
  if v_grupo.id is null then perform pg_sleep(0.5); return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return; end if;
  select * into v_intentos_nombre from public.intentos_nombre_estudiante where usuario_id = auth.uid();
  if v_intentos_nombre.bloqueado_hasta is not null and v_intentos_nombre.bloqueado_hasta > now() then
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, format('Demasiados intentos. Espera %s minutos e intenta de nuevo.', greatest(1, ceil(extract(epoch from (v_intentos_nombre.bloqueado_hasta - now())) / 60)))::text; return;
  end if;
  select e.id, e.nombre, e.nip_hash, e.activo, e.intentos_fallidos, e.bloqueado_hasta into v_estudiante
    from public.estudiantes e where e.grupo_id = v_grupo.id and public.normalizar_nombre(e.nombre) = public.normalizar_nombre(p_nombre);
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
    update public.estudiantes set auth_user_id = null where auth_user_id = auth.uid() and id <> v_estudiante.id;
    update public.estudiantes set auth_user_id = auth.uid(), nip_hash = extensions.crypt(p_nip, extensions.gen_salt('bf')), intentos_fallidos = 0, bloqueado_hasta = null where id = v_estudiante.id;
    return query select v_estudiante.id, v_estudiante.nombre, v_grupo.id, v_grupo.nombre, true, null::text; return;
  end if;
  if extensions.crypt(p_nip, v_estudiante.nip_hash) <> v_estudiante.nip_hash then
    update public.estudiantes set intentos_fallidos = v_estudiante.intentos_fallidos + 1, bloqueado_hasta = case when v_estudiante.intentos_fallidos + 1 >= v_max_intentos then now() + (v_minutos_bloqueo || ' minutes')::interval else bloqueado_hasta end where id = v_estudiante.id;
    perform pg_sleep(0.5); return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return;
  end if;
  update public.estudiantes set auth_user_id = null where auth_user_id = auth.uid() and id <> v_estudiante.id;
  update public.estudiantes set auth_user_id = auth.uid(), intentos_fallidos = 0, bloqueado_hasta = null where id = v_estudiante.id;
  return query select v_estudiante.id, v_estudiante.nombre, v_grupo.id, v_grupo.nombre, false, null::text;
end;
$$;

create or replace function public.agregar_estudiantes_con_boleta(p_grupo_id uuid, p_estudiantes jsonb)
returns integer language plpgsql security definer set search_path = public, extensions
as $$
declare v_item jsonb; v_nombre text; v_boleta text; v_creados integer := 0;
begin
  if not exists (select 1 from public.grupos where id = p_grupo_id and docente_id = auth.uid()) then raise exception 'No tienes permiso sobre este grupo.'; end if;
  if jsonb_typeof(p_estudiantes) <> 'array' or jsonb_array_length(p_estudiantes) > 100 then raise exception 'La lista de estudiantes no es válida.'; end if;
  for v_item in select * from jsonb_array_elements(p_estudiantes) loop
    v_nombre := public.normalizar_nombre(coalesce(v_item->>'nombre', '')); v_boleta := regexp_replace(coalesce(v_item->>'boleta', ''), '\D', '', 'g');
    if v_nombre = '' then raise exception 'Falta el nombre de un estudiante.'; end if;
    if length(v_boleta) < 4 or length(v_boleta) > 20 then raise exception 'La boleta de "%" no es válida.', v_nombre; end if;
    insert into public.estudiantes (nombre, grupo_id, boleta, nip_hash, debe_cambiar_nip) values (v_nombre, p_grupo_id, v_boleta, extensions.crypt(right(v_boleta, 4), extensions.gen_salt('bf')), true);
    v_creados := v_creados + 1;
  end loop;
  return v_creados;
end;
$$;

create or replace function public.cambiar_nip_estudiante(p_nip_actual text, p_nip_nuevo text)
returns text language plpgsql security definer set search_path = public, extensions
as $$
declare v_estudiante record; v_max_intentos constant int := 5; v_minutos_bloqueo constant int := 15;
begin
  if auth.uid() is null then raise exception 'Sesión inválida, intenta de nuevo'; end if;
  if p_nip_nuevo !~ '^[0-9]{4}$' then raise exception 'Tu nuevo NIP debe ser de 4 dígitos.'; end if;
  select id, nip_hash, intentos_fallidos, bloqueado_hasta into v_estudiante from public.estudiantes where auth_user_id = auth.uid();
  if v_estudiante.id is null then raise exception 'No encontramos tu sesión de estudiante, intenta entrar de nuevo.'; end if;
  if v_estudiante.bloqueado_hasta is not null and v_estudiante.bloqueado_hasta > now() then return format('Demasiados intentos. Espera %s minutos e intenta de nuevo.', greatest(1, ceil(extract(epoch from (v_estudiante.bloqueado_hasta - now())) / 60))); end if;
  if extensions.crypt(p_nip_actual, v_estudiante.nip_hash) <> v_estudiante.nip_hash then
    update public.estudiantes set intentos_fallidos = v_estudiante.intentos_fallidos + 1, bloqueado_hasta = case when v_estudiante.intentos_fallidos + 1 >= v_max_intentos then now() + (v_minutos_bloqueo || ' minutes')::interval else bloqueado_hasta end where id = v_estudiante.id;
    perform pg_sleep(0.5); return 'Tu NIP actual no es correcto.';
  end if;
  update public.estudiantes set nip_hash = extensions.crypt(p_nip_nuevo, extensions.gen_salt('bf')), intentos_fallidos = 0, bloqueado_hasta = null, debe_cambiar_nip = false where id = v_estudiante.id;
  return null;
end;
$$;

create or replace function public.reiniciar_nip_estudiante(p_estudiante_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.estudiantes e join public.grupos g on g.id = e.grupo_id where e.id = p_estudiante_id and g.docente_id = auth.uid()) then raise exception 'No tienes permiso sobre este estudiante.'; end if;
  update public.estudiantes set nip_hash = null, auth_user_id = null, debe_cambiar_nip = false where id = p_estudiante_id;
end;
$$;

create or replace function public.crear_perfil_docente(p_nombre text, p_codigo_invitacion text)
returns text language plpgsql security definer set search_path = public, extensions
as $$
declare v_hash text; v_correo text; v_intentos record; v_max_intentos constant int := 5; v_minutos_bloqueo constant int := 15;
begin
  if auth.uid() is null then raise exception 'Sesión inválida, intenta de nuevo'; end if;
  select * into v_intentos from public.intentos_codigo_invitacion where usuario_id = auth.uid();
  if v_intentos.bloqueado_hasta is not null and v_intentos.bloqueado_hasta > now() then return format('Demasiados intentos. Espera %s minutos e intenta de nuevo.', greatest(1, ceil(extract(epoch from (v_intentos.bloqueado_hasta - now())) / 60))); end if;
  select valor into v_hash from public.configuracion_plataforma where clave = 'codigo_invitacion_docente_hash';
  if v_hash is null or extensions.crypt(coalesce(trim(p_codigo_invitacion), ''), v_hash) <> v_hash then
    insert into public.intentos_codigo_invitacion (usuario_id, intentos, bloqueado_hasta) values (auth.uid(), 1, null)
      on conflict (usuario_id) do update set intentos = public.intentos_codigo_invitacion.intentos + 1, bloqueado_hasta = case when public.intentos_codigo_invitacion.intentos + 1 >= v_max_intentos then now() + (v_minutos_bloqueo || ' minutes')::interval else public.intentos_codigo_invitacion.bloqueado_hasta end;
    perform pg_sleep(0.5); return 'El código de invitación no es correcto.';
  end if;
  delete from public.intentos_codigo_invitacion where usuario_id = auth.uid();
  if p_nombre is null or length(trim(p_nombre)) = 0 or length(p_nombre) > 200 then raise exception 'Escribe tu nombre.'; end if;
  select email into v_correo from auth.users where id = auth.uid();
  insert into public.docentes (id, nombre, correo) values (auth.uid(), trim(p_nombre), v_correo) on conflict (id) do nothing;
  return null;
end;
$$;

create or replace function public.proteger_columnas_entrega()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and exists (
    select 1
    from public.grupos g
    join public.estudiantes e on e.grupo_id = g.id
    where g.docente_id = auth.uid() and e.id = old.estudiante_id
  ) then
    if new.estudiante_id is distinct from old.estudiante_id
      or new.actividad_id is distinct from old.actividad_id
      or new.respuesta is distinct from old.respuesta
      or new.puntaje_auto is distinct from old.puntaje_auto
      or new.created_at is distinct from old.created_at then
      raise exception 'La docente solo puede actualizar el estado de apoyo de una entrega.';
    end if;
  else
    if auth.uid() is not null and new.evaluacion_docente is distinct from old.evaluacion_docente then raise exception 'No puedes modificar la evaluación de la docente.'; end if;
    if new.estudiante_id is distinct from old.estudiante_id or new.actividad_id is distinct from old.actividad_id then raise exception 'No puedes reasignar esta entrega.'; end if;
  end if;
  return new;
end;
$$;

create or replace function public.proteger_correo_docente()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.correo is distinct from old.correo then raise exception 'El correo se administra desde tu inicio de sesión, no se puede editar aquí.'; end if;
  return new;
end;
$$;

create or replace function public.verificar_insignias()
returns table(nombre text, descripcion text)
language plpgsql security definer set search_path = public
as $$
declare v_estudiante uuid := public.estudiante_actual(); v_total_reflexiones int; v_total_actividades int; v_total_hechas int; v_unidades_con_ambas_confianzas int; v_orden int; v_unidad_total int; v_unidad_hechas int;
begin
  if v_estudiante is null then raise exception 'No hay una sesión de estudiante válida'; end if;
  select count(*) into v_total_reflexiones from public.reflexiones where estudiante_id = v_estudiante and momento = 'cierre' and unidad_id is not null;
  select count(*) into v_total_actividades from public.actividades;
  select count(*) into v_total_hechas from public.entregas where estudiante_id = v_estudiante;
  select count(*) into v_unidades_con_ambas_confianzas from (select unidad_id from public.autoevaluaciones_confianza where estudiante_id = v_estudiante group by unidad_id having count(distinct momento) = 2) x;
  if v_total_reflexiones >= 1 then insert into public.insignias_otorgadas (estudiante_id, insignia_id) select v_estudiante, id from public.insignias where nombre = 'Primera reflexión' on conflict do nothing; end if;
  if v_total_reflexiones >= 3 then insert into public.insignias_otorgadas (estudiante_id, insignia_id) select v_estudiante, id from public.insignias where nombre = 'Mente reflexiva' on conflict do nothing; end if;
  for v_orden, v_unidad_total, v_unidad_hechas in
    select u.orden, count(a.id), count(e.id)
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
  if v_total_actividades > 0 and v_total_hechas = v_total_actividades then insert into public.insignias_otorgadas (estudiante_id, insignia_id) select v_estudiante, id from public.insignias where nombre = 'Voz y Palabra completo' on conflict do nothing; end if;
  if v_unidades_con_ambas_confianzas >= 1 then insert into public.insignias_otorgadas (estudiante_id, insignia_id) select v_estudiante, id from public.insignias where nombre = 'Autoconocimiento' on conflict do nothing; end if;
  return query select i.nombre, i.descripcion from public.insignias_otorgadas io join public.insignias i on i.id = io.insignia_id where io.estudiante_id = v_estudiante order by io.created_at;
end;
$$;

drop trigger if exists trg_proteger_correo_docente on public.docentes;
create trigger trg_proteger_correo_docente
before update on public.docentes
for each row execute function public.proteger_correo_docente();

drop trigger if exists trg_proteger_entrega on public.entregas;
create trigger trg_proteger_entrega
before update on public.entregas
for each row execute function public.proteger_columnas_entrega();

-- Los triggers internos no son endpoints RPC.
revoke execute on function public.proteger_columnas_entrega() from public, anon, authenticated;
revoke execute on function public.proteger_correo_docente() from public, anon, authenticated;
revoke execute on function public.estudiante_tiene_nip(text, text) from public, anon, authenticated;
revoke execute on function public.agregar_estudiantes_con_boleta(uuid, jsonb) from public, anon;
grant execute on function public.agregar_estudiantes_con_boleta(uuid, jsonb) to authenticated;
revoke execute on function public.reiniciar_nip_estudiante(uuid) from public, anon;
grant execute on function public.reiniciar_nip_estudiante(uuid) to authenticated;
revoke execute on function public.ingresar_estudiante(text, text, text) from public, anon;
grant execute on function public.ingresar_estudiante(text, text, text) to authenticated;
revoke execute on function public.cambiar_nip_estudiante(text, text) from public, anon;
grant execute on function public.cambiar_nip_estudiante(text, text) to authenticated;
revoke execute on function public.crear_perfil_docente(text, text) from public, anon;
grant execute on function public.crear_perfil_docente(text, text) to authenticated;
revoke execute on function public.verificar_insignias() from public, anon;
grant execute on function public.verificar_insignias() to authenticated;
revoke execute on function public.estudiante_actual() from public, anon;
grant execute on function public.estudiante_actual() to authenticated;
revoke execute on function public.grupo_del_estudiante_actual() from public, anon;
grant execute on function public.grupo_del_estudiante_actual() to authenticated;

create or replace function public.guardar_entrega_auto(
  p_estudiante_id uuid,
  p_actividad_id uuid,
  p_respuesta jsonb,
  p_puntaje_auto integer,
  p_estado text
)
returns table(
  intentos integer,
  mejor_puntaje integer,
  puntaje_guardado integer,
  respuesta_guardada jsonb,
  respuesta_cliente jsonb
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_entrega public.entregas%rowtype;
  v_intentos_previos integer;
  v_intentos integer;
  v_mejor_puntaje integer;
  v_respuesta_limpia jsonb;
  v_meta jsonb;
  v_respuesta_cliente jsonb;
  v_respuesta_guardada jsonb;
  v_intentos_texto text;
begin
  if p_estudiante_id is null or p_actividad_id is null then
    raise exception 'La entrega no es válida.';
  end if;

  if p_respuesta is null or jsonb_typeof(p_respuesta) <> 'object' then
    raise exception 'La respuesta no es válida.';
  end if;

  if p_puntaje_auto is null or p_puntaje_auto < 0 or p_puntaje_auto > 100 then
    raise exception 'El puntaje no es válido.';
  end if;

  if p_estado not in ('completada', 'pendiente_revision') then
    raise exception 'El estado de la entrega no es válido.';
  end if;

  v_respuesta_limpia := p_respuesta - '_meta';

  loop
    select *
      into v_entrega
      from public.entregas
     where estudiante_id = p_estudiante_id
       and actividad_id = p_actividad_id
     for update;

    if found then
      v_intentos_previos := 1;
      if v_entrega.respuesta is not null
        and jsonb_typeof(v_entrega.respuesta -> '_meta') = 'object' then
        v_intentos_texto := v_entrega.respuesta -> '_meta' ->> 'intentos';
        if v_intentos_texto ~ '^[1-3]$' then
          v_intentos_previos := v_intentos_texto::integer;
        end if;
      end if;

      if v_intentos_previos >= 3 then
        raise exception 'Ya usaste los 3 intentos de esta actividad.'
          using errcode = 'check_violation';
      end if;

      v_intentos := v_intentos_previos + 1;
      v_mejor_puntaje := greatest(coalesce(v_entrega.puntaje_auto, 0), p_puntaje_auto);
      v_meta := jsonb_build_object('intentos', v_intentos, 'mejorPuntaje', v_mejor_puntaje);
      v_respuesta_cliente := v_respuesta_limpia || jsonb_build_object('_meta', v_meta);

      if coalesce(v_entrega.puntaje_auto, -1) > p_puntaje_auto
        and v_entrega.respuesta is not null
        and jsonb_typeof(v_entrega.respuesta) = 'object' then
        v_respuesta_guardada := (v_entrega.respuesta - '_meta') || jsonb_build_object('_meta', v_meta);
      else
        v_respuesta_guardada := v_respuesta_cliente;
      end if;

      update public.entregas
         set respuesta = v_respuesta_guardada,
             estado = p_estado,
             puntaje_auto = v_mejor_puntaje
       where id = v_entrega.id;

      intentos := v_intentos;
      mejor_puntaje := v_mejor_puntaje;
      puntaje_guardado := v_mejor_puntaje;
      respuesta_guardada := v_respuesta_guardada;
      respuesta_cliente := v_respuesta_cliente;
      return next;
      return;
    end if;

    begin
      v_intentos := 1;
      v_mejor_puntaje := p_puntaje_auto;
      v_meta := jsonb_build_object('intentos', v_intentos, 'mejorPuntaje', v_mejor_puntaje);
      v_respuesta_cliente := v_respuesta_limpia || jsonb_build_object('_meta', v_meta);

      insert into public.entregas (
        estudiante_id,
        actividad_id,
        respuesta,
        estado,
        puntaje_auto
      )
      values (
        p_estudiante_id,
        p_actividad_id,
        v_respuesta_cliente,
        p_estado,
        v_mejor_puntaje
      );

      intentos := v_intentos;
      mejor_puntaje := v_mejor_puntaje;
      puntaje_guardado := v_mejor_puntaje;
      respuesta_guardada := v_respuesta_cliente;
      respuesta_cliente := v_respuesta_cliente;
      return next;
      return;
    exception
      when unique_violation then
        -- Otra solicitud creó la fila después del SELECT. En la siguiente
        -- vuelta la encontraremos bloqueada y el contador será atómico.
        null;
    end;
  end loop;
end;
$$;

revoke execute on function public.guardar_entrega_auto(uuid, uuid, jsonb, integer, text) from public, anon, authenticated;
grant execute on function public.guardar_entrega_auto(uuid, uuid, jsonb, integer, text) to service_role;
