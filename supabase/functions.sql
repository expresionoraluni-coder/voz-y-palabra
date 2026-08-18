-- Funciones de aplicación necesarias para reconstruir Voz y Palabra.
-- Ejecutar después de schema.sql. No contiene datos ni claves.

create or replace function public.normalizar_nombre(p_nombre text)
returns text language sql immutable set search_path = public, extensions
as $$ select upper(trim(regexp_replace(extensions.unaccent(coalesce(p_nombre, '')), '\s+', ' ', 'g'))) $$;

-- Rate limit ligero por IP para el RPC de ingreso. Corre antes de los RPC del
-- Data API, usa una tabla privada y no duerme una conexión de Postgres.
--
-- El pre-request de PostgREST debe vivir en un esquema expuesto (la función
-- corre con el rol de la petición). La tabla y el estado siguen en `private`;
-- por eso esta función es SECURITY DEFINER y limita su lógica al endpoint
-- específico de ingreso estudiantil.
create or replace function public.controlar_rate_limit_ingreso()
returns void
language plpgsql
security definer
set search_path = private, pg_catalog
as $$
declare
  v_path text := current_setting('request.path', true);
  v_method text := current_setting('request.method', true);
  v_headers jsonb := '{}'::jsonb;
  v_ip_text text;
  v_ip inet;
  v_intentos int;
begin
  if v_method <> 'POST' or v_path is null
     or (v_path not like '%/rpc/ingresar_estudiante'
         and v_path not like '%/rpc/crear_perfil_docente') then
    return;
  end if;

  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  exception when others then
    return;
  end;

  v_ip_text := split_part(coalesce(v_headers ->> 'x-forwarded-for', v_headers ->> 'cf-connecting-ip', ''), ',', 1);
  if btrim(v_ip_text) = '' then return; end if;
  begin
    v_ip := btrim(v_ip_text)::inet;
  exception when others then
    return;
  end;

  delete from private.ingreso_rate_limits
   where actualizado_en < now() - interval '1 day';

  insert into private.ingreso_rate_limits (ip, ventana_inicio, intentos, actualizado_en)
  values (v_ip, now(), 1, now())
  on conflict (ip) do update
    set intentos = case
      when private.ingreso_rate_limits.actualizado_en < now() - interval '5 minutes' then 1
      else private.ingreso_rate_limits.intentos + 1
    end,
    ventana_inicio = case
      when private.ingreso_rate_limits.actualizado_en < now() - interval '5 minutes' then now()
      else private.ingreso_rate_limits.ventana_inicio
    end,
    actualizado_en = now()
  returning intentos into v_intentos;

  if v_intentos > 120 then
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'code', 'INGRESO_RATE_LIMIT',
        'message', 'Demasiadas solicitudes de ingreso desde esta red. Intenta de nuevo en unos minutos.')::text,
      detail = json_build_object('status', 429, 'status_text', 'Too Many Requests')::text;
  end if;
end;
$$;

grant execute on function public.controlar_rate_limit_ingreso() to public;
alter role authenticator set pgrst.db_pre_request = 'public.controlar_rate_limit_ingreso';
notify pgrst, 'reload config';

create or replace function public.estudiante_actual()
returns uuid language sql stable security definer set search_path = public
as $$
  select e.id
  from public.estudiantes e
  where e.auth_user_id = auth.uid()
    and e.activo = true
$$;

create or replace function public.grupo_del_estudiante_actual()
returns uuid language sql stable security definer set search_path = public
as $$ select grupo_id from public.estudiantes where auth_user_id = auth.uid() and activo = true $$;

create or replace function public.ingresar_estudiante(p_codigo text, p_nombre text, p_nip text)
returns table(id uuid, nombre text, grupo_id uuid, grupo_nombre text, nip_nuevo boolean, error text)
language plpgsql security definer set search_path = public, extensions
as $$
declare v_grupo record; v_estudiante record; v_intentos_nombre record;
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
  if v_grupo.id is null then return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return; end if;
  select * into v_intentos_nombre from public.intentos_nombre_estudiante where usuario_id = auth.uid();
  if v_intentos_nombre.bloqueado_hasta is not null and v_intentos_nombre.bloqueado_hasta > now() then
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, format('Demasiados intentos. Espera %s minutos e intenta de nuevo.', greatest(1, ceil(extract(epoch from (v_intentos_nombre.bloqueado_hasta - now())) / 60)))::text; return;
  end if;
  select e.id, e.nombre, e.nip_hash, e.activo, e.auth_user_id, e.debe_cambiar_nip,
         e.intentos_fallidos, e.bloqueado_hasta into v_estudiante
    from public.estudiantes e where e.grupo_id = v_grupo.id and public.normalizar_nombre(e.nombre) = public.normalizar_nombre(p_nombre)
    for update;
  if v_estudiante.id is null then
    insert into public.intentos_nombre_estudiante (usuario_id, intentos, bloqueado_hasta) values (auth.uid(), 1, null)
      on conflict (usuario_id) do update set intentos = public.intentos_nombre_estudiante.intentos + 1,
      bloqueado_hasta = case when public.intentos_nombre_estudiante.intentos + 1 >= v_max_intentos then now() + (v_minutos_bloqueo || ' minutes')::interval else public.intentos_nombre_estudiante.bloqueado_hasta end;
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return;
  end if;
  if not v_estudiante.activo then return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return; end if;
  if v_estudiante.bloqueado_hasta is not null and v_estudiante.bloqueado_hasta > now() then
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, format('Demasiados intentos. Espera %s minutos e intenta de nuevo.', greatest(1, ceil(extract(epoch from (v_estudiante.bloqueado_hasta - now())) / 60)))::text; return;
  end if;
  delete from public.intentos_nombre_estudiante where usuario_id = auth.uid();
  if v_estudiante.nip_hash is null then
    if v_estudiante.auth_user_id is not null and v_estudiante.auth_user_id <> auth.uid() then
      return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return;
    end if;
    update public.estudiantes set auth_user_id = null where auth_user_id = auth.uid() and public.estudiantes.id <> v_estudiante.id;
    update public.estudiantes set auth_user_id = auth.uid(), nip_hash = extensions.crypt(p_nip, extensions.gen_salt('bf')), intentos_fallidos = 0, bloqueado_hasta = null where public.estudiantes.id = v_estudiante.id;
    return query select v_estudiante.id, v_estudiante.nombre, v_grupo.id, v_grupo.nombre, true, null::text; return;
  end if;
  if extensions.crypt(p_nip, v_estudiante.nip_hash) <> v_estudiante.nip_hash then
    update public.estudiantes set intentos_fallidos = v_estudiante.intentos_fallidos + 1, bloqueado_hasta = case when v_estudiante.intentos_fallidos + 1 >= v_max_intentos then now() + (v_minutos_bloqueo || ' minutes')::interval else bloqueado_hasta end where public.estudiantes.id = v_estudiante.id;
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return;
  end if;
  if v_estudiante.debe_cambiar_nip and v_estudiante.auth_user_id is not null and v_estudiante.auth_user_id <> auth.uid() then
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos; return;
  end if;
  update public.estudiantes set auth_user_id = null where auth_user_id = auth.uid() and public.estudiantes.id <> v_estudiante.id;
  update public.estudiantes set auth_user_id = auth.uid(), intentos_fallidos = 0, bloqueado_hasta = null where public.estudiantes.id = v_estudiante.id;
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
  if coalesce(auth.jwt() ->> 'is_anonymous', 'false') <> 'true' then
    raise exception 'Este cambio requiere una sesión de estudiante.';
  end if;
  if coalesce(p_nip_actual, '') !~ '^[0-9]{4}$' then return 'Tu NIP actual no es correcto.'; end if;
  if coalesce(p_nip_nuevo, '') !~ '^[0-9]{4}$' then raise exception 'Tu nuevo NIP debe ser de 4 dígitos.'; end if;
  select id, nip_hash, intentos_fallidos, bloqueado_hasta into v_estudiante
    from public.estudiantes
    where auth_user_id = auth.uid() and activo = true
    for update;
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

drop function if exists public.reiniciar_nip_estudiante(uuid);
create function public.reiniciar_nip_estudiante(p_estudiante_id uuid)
returns text language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_nip_temporal text;
  v_bytes bytea;
begin
  if not exists (select 1 from public.estudiantes e join public.grupos g on g.id = e.grupo_id where e.id = p_estudiante_id and g.docente_id = auth.uid()) then raise exception 'No tienes permiso sobre este estudiante.'; end if;
  v_bytes := extensions.gen_random_bytes(2);
  v_nip_temporal := (1000 + (get_byte(v_bytes, 0) * 256 + get_byte(v_bytes, 1)) % 9000)::text;
  update public.estudiantes
     set nip_hash = extensions.crypt(v_nip_temporal, extensions.gen_salt('bf')),
         auth_user_id = null,
         intentos_fallidos = 0,
         bloqueado_hasta = null,
         debe_cambiar_nip = true
   where id = p_estudiante_id;
  return v_nip_temporal;
end;
$$;

create or replace function public.validar_invitacion_alta_docente()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_codigo text;
begin
  -- Las sesiones anónimas de estudiantes no pasan por este control.
  if coalesce(new.is_anonymous, false) then return new; end if;

  v_codigo := new.raw_user_meta_data ->> 'codigo_invitacion_docente';
  select valor into v_hash
    from public.configuracion_plataforma
    where clave = 'codigo_invitacion_docente_hash';
  if length(trim(coalesce(v_codigo, ''))) < 4
     or length(trim(coalesce(v_codigo, ''))) > 64
     or v_hash is null
     or extensions.crypt(trim(coalesce(v_codigo, '')), v_hash) <> v_hash then
    raise exception 'El código de invitación no es correcto.';
  end if;

  -- El secreto no debe quedar guardado en auth.users ni viajar en el JWT.
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb)
    - 'codigo_invitacion_docente';
  return new;
end;
$$;

drop trigger if exists validar_invitacion_alta_docente on auth.users;
create trigger validar_invitacion_alta_docente
  before insert on auth.users
  for each row execute function public.validar_invitacion_alta_docente();

create or replace function public.crear_perfil_docente(p_nombre text, p_codigo_invitacion text)
returns text language plpgsql security definer set search_path = public, extensions
as $$
declare v_hash text; v_correo text; v_intentos record; v_max_intentos constant int := 5; v_minutos_bloqueo constant int := 15;
  v_email_confirmado timestamptz;
begin
  if auth.uid() is null then raise exception 'Sesión inválida, intenta de nuevo'; end if;
  if coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true' then
    raise exception 'Se requiere una cuenta docente confirmada.';
  end if;
  select email, email_confirmed_at into v_correo, v_email_confirmado from auth.users where id = auth.uid();
  if lower(trim(coalesce(v_correo, ''))) = lower('digp.inv.ipn@gmail.com') then
    raise exception 'Esta cuenta tiene acceso administrativo y no se puede registrar como docente.';
  end if;
  if v_email_confirmado is null then raise exception 'Confirma tu correo antes de continuar.'; end if;
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
  with unidades_completas as (
    select u.id
      from public.unidades u
      join public.actividades a on a.unidad_id = u.id
      left join public.entregas e on e.actividad_id = a.id and e.estudiante_id = v_estudiante
     group by u.id
    having count(distinct a.id) > 0
       and count(distinct a.id) filter (
         where e.id is not null
           and (e.puntaje_auto is null or e.puntaje_auto >= 70 or e.respuesta -> '_meta' ->> 'intentos' = '3')
       ) = count(distinct a.id)
  )
  select count(distinct r.unidad_id) into v_total_reflexiones
    from public.reflexiones r
   where r.estudiante_id = v_estudiante
     and r.momento = 'cierre'
     and r.unidad_id is not null
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
       and count(distinct a.id) filter (
         where e.id is not null
           and (e.puntaje_auto is null or e.puntaje_auto >= 70 or e.respuesta -> '_meta' ->> 'intentos' = '3')
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
revoke execute on function public.normalizar_nombre(text) from public, anon, authenticated;

-- El correo de la docente no se expone por el Data API. Solo se leen las
-- columnas necesarias para pintar el panel; las funciones internas y
-- service_role conservan acceso completo.
revoke select on public.docentes from public, anon, authenticated;
grant select (id, nombre, created_at) on public.docentes to authenticated;
grant all on public.docentes to service_role;

revoke select on public.estudiantes from public, anon, authenticated;
grant select (id, nombre, grupo_id, activo, boleta, debe_cambiar_nip, created_at)
  on public.estudiantes to authenticated;
grant all on public.estudiantes to service_role;

-- Tablas internas: las funciones SECURITY DEFINER las usan por dentro; el
-- cliente nunca recibe privilegios directos sobre sus contadores o secretos.
revoke all on table public.configuracion_plataforma,
  public.intentos_codigo_invitacion,
  public.intentos_nombre_estudiante,
  public.intentos_nombre_grupo
from public, anon, authenticated;
grant all on table public.configuracion_plataforma,
  public.intentos_codigo_invitacion,
  public.intentos_nombre_estudiante,
  public.intentos_nombre_grupo
to service_role;

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
-- El perfil administrativo es independiente del perfil docente. La cuenta
-- inicial se crea de forma controlada; el cliente solo consulta su perfil y
-- opera sobre reportes mediante RLS.
revoke all on public.administradores from public, anon, authenticated;
grant select (id, nombre, activo, created_at) on public.administradores to authenticated;
grant all on public.administradores to service_role;
revoke all on public.reportes from public, anon, authenticated;
grant select, update on public.reportes to authenticated;
revoke delete on public.reportes from public, anon, authenticated;
revoke all on function public.validar_invitacion_alta_docente() from public, anon, authenticated;
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

-- Administración permanente y registro seguro de reportes. Cuando la cuenta
-- administrativa ya tiene un factor verificado, sus consultas requieren AAL2.
create or replace function public.es_administrador_activo()
returns boolean language sql stable security definer set search_path = public, auth, extensions
as $$
  select exists (
    select 1 from public.administradores a
    join auth.users u on u.id = a.id
    where a.id = (select auth.uid())
      and a.activo = true
      and u.email_confirmed_at is not null
      and lower(u.email) = lower('digp.inv.ipn@gmail.com')
      and exists (
        select 1 from auth.mfa_factors factor
        where factor.user_id = (select auth.uid())
          and factor.factor_type = 'totp'
          and factor.status = 'verified'
      )
      and coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
  );
$$;

revoke all on function public.es_administrador_activo() from public, anon;
grant execute on function public.es_administrador_activo() to authenticated;

create or replace function public.registrar_reporte(
  p_reportante_tipo text, p_estudiante_id uuid, p_docente_id uuid,
  p_grupo_id uuid, p_unidad_id uuid, p_actividad_id uuid,
  p_categoria text, p_descripcion text, p_ruta text, p_contexto jsonb
)
returns table(id uuid, duplicado boolean)
language plpgsql security definer set search_path = public
as $$
declare v_existente uuid; v_prioridad text; v_unidad_id uuid := p_unidad_id; v_contexto jsonb := coalesce(p_contexto, '{}'::jsonb);
begin
  if auth.uid() is null then raise exception 'Sesión inválida, intenta de nuevo.'; end if;
  if p_reportante_tipo not in ('estudiante', 'docente') then raise exception 'El tipo de reporte no es válido.'; end if;
  if p_categoria not in (
    'estudiante_acceso', 'estudiante_actividad', 'estudiante_avance', 'estudiante_instruccion',
    'estudiante_video', 'estudiante_tecnico', 'estudiante_contenido', 'estudiante_otro',
    'docente_acceso', 'docente_grupo', 'docente_estudiantes', 'docente_actividad',
    'docente_seguimiento', 'docente_video', 'docente_tecnico', 'docente_otro',
    'acceso', 'actividad', 'avance', 'video', 'carga', 'contenido', 'orientacion', 'otro'
  ) then raise exception 'La categoría no es válida.'; end if;
  if p_descripcion is null or length(trim(p_descripcion)) not between 10 and 2000 then raise exception 'La descripción debe tener entre 10 y 2000 caracteres.'; end if;
  if p_ruta is not null and length(p_ruta) > 300 then raise exception 'La pantalla indicada no es válida.'; end if;
  if jsonb_typeof(v_contexto) <> 'object' or length(v_contexto::text) > 4000 then raise exception 'El contexto del reporte no es válido.'; end if;
  if p_unidad_id is not null and not exists (select 1 from public.unidades u where u.id = p_unidad_id) then raise exception 'La unidad del reporte no es válida.'; end if;
  if p_actividad_id is not null then
    select a.unidad_id into v_unidad_id from public.actividades a where a.id = p_actividad_id and (p_unidad_id is null or a.unidad_id = p_unidad_id);
    if v_unidad_id is null then raise exception 'La actividad del reporte no es válida.'; end if;
    v_contexto := jsonb_set(v_contexto, '{unidad_id}', to_jsonb(v_unidad_id::text), true);
  end if;
  if p_reportante_tipo = 'estudiante' then
    if p_categoria not in ('estudiante_acceso', 'estudiante_actividad', 'estudiante_avance', 'estudiante_instruccion', 'estudiante_video', 'estudiante_tecnico', 'estudiante_contenido', 'estudiante_otro') then raise exception 'La categoría no corresponde a una solicitud de estudiante.'; end if;
    if p_estudiante_id is null or p_docente_id is not null then raise exception 'El reporte de estudiante no es válido.'; end if;
    if not exists (select 1 from public.estudiantes e where e.id = p_estudiante_id and e.auth_user_id = (select auth.uid()) and e.activo = true and (p_grupo_id is null or p_grupo_id = e.grupo_id)) then raise exception 'No tienes permiso para reportar ese contexto.'; end if;
  else
    if p_categoria not in ('docente_acceso', 'docente_grupo', 'docente_estudiantes', 'docente_actividad', 'docente_seguimiento', 'docente_video', 'docente_tecnico', 'docente_otro') then raise exception 'La categoría no corresponde a una solicitud de docente.'; end if;
    if p_docente_id is null or p_estudiante_id is not null or p_docente_id <> (select auth.uid()) then raise exception 'El reporte de docente no es válido.'; end if;
    if not exists (select 1 from public.docentes d where d.id = (select auth.uid())) then raise exception 'No encontramos tu perfil docente.'; end if;
    if p_grupo_id is not null and not exists (select 1 from public.grupos g where g.id = p_grupo_id and g.docente_id = (select auth.uid())) then raise exception 'No tienes permiso para reportar ese grupo.'; end if;
  end if;
  select r.id into v_existente from public.reportes r where r.reportante_id = (select auth.uid()) and r.categoria = p_categoria and coalesce(r.ruta, '') = coalesce(p_ruta, '') and r.estado in ('recibido', 'en_revision', 'necesita_informacion') and r.created_at >= now() - interval '24 hours' order by r.created_at desc limit 1;
  if v_existente is not null then return query select v_existente, true; return; end if;
  v_prioridad := case
    when p_categoria in ('estudiante_acceso', 'estudiante_avance', 'docente_acceso', 'acceso', 'avance') then 'alta'
    when p_categoria in ('estudiante_instruccion', 'orientacion') then 'baja'
    else 'normal'
  end;
  insert into public.reportes (reportante_id, reportante_tipo, estudiante_id, docente_id, grupo_id, unidad_id, actividad_id, categoria, descripcion, prioridad, ruta, contexto)
  values ((select auth.uid()), p_reportante_tipo, p_estudiante_id, p_docente_id, p_grupo_id, v_unidad_id, p_actividad_id, p_categoria, trim(p_descripcion), v_prioridad, p_ruta, v_contexto)
  returning public.reportes.id into v_existente;
  return query select v_existente, false;
end;
$$;

revoke execute on function public.registrar_reporte(text, uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb) from public, anon;
grant execute on function public.registrar_reporte(text, uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb) to authenticated;

create or replace function public.proteger_reporte_atencion()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.reportante_id is distinct from old.reportante_id or new.reportante_tipo is distinct from old.reportante_tipo or new.estudiante_id is distinct from old.estudiante_id or new.docente_id is distinct from old.docente_id or new.grupo_id is distinct from old.grupo_id or new.unidad_id is distinct from old.unidad_id or new.actividad_id is distinct from old.actividad_id or new.categoria is distinct from old.categoria or new.descripcion is distinct from old.descripcion or new.ruta is distinct from old.ruta or new.contexto is distinct from old.contexto or new.created_at is distinct from old.created_at then
    raise exception 'Los datos originales del reporte no se pueden modificar.';
  end if;
  if auth.uid() is not null and not public.es_administrador_activo() then raise exception 'No tienes permiso para atender reportes.'; end if;
  if auth.uid() is not null and new.atendido_por is not null and new.atendido_por <> (select auth.uid()) then raise exception 'El reporte debe quedar atendido por la cuenta administrativa activa.'; end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_reporte_atencion on public.reportes;
create trigger trg_proteger_reporte_atencion before update on public.reportes for each row execute function public.proteger_reporte_atencion();
revoke execute on function public.proteger_reporte_atencion() from public, anon, authenticated;
