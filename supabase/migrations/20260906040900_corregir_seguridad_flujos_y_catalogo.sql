begin;

-- Flujo estudiantil: la boleta aporta los últimos cuatro dígitos en el primer ingreso.
-- Después, la persona estudiante crea su NIP permanente.

create table if not exists private.altas_docente_autorizadas (
  usuario_id uuid primary key,
  autorizado_en timestamptz not null default now(),
  expira_en timestamptz not null default (now() + interval '24 hours'),
  usado_en timestamptz
);
revoke all on table private.altas_docente_autorizadas from public, anon, authenticated;
grant all on table private.altas_docente_autorizadas to service_role;

-- Conserva el alta de cuentas ya confirmadas que aún no terminaron su perfil.
insert into private.altas_docente_autorizadas (usuario_id, autorizado_en, expira_en, usado_en)
select u.id, now(), now() + interval '7 days', null
from auth.users u
where coalesce(u.is_anonymous, false) = false
  and u.email_confirmed_at is not null
  and not exists (select 1 from public.docentes d where d.id = u.id)
  and not exists (select 1 from public.administradores a where a.id = u.id)
on conflict (usuario_id) do nothing;

-- Una sola escala de confianza para toda la experiencia: 1 a 5.
alter table public.autoevaluaciones_confianza
  drop constraint if exists autoevaluaciones_confianza_valor_check;
update public.autoevaluaciones_confianza
set valor = greatest(1, least(5, round(valor / 25.0)::int + 1));
alter table public.autoevaluaciones_confianza
  add constraint autoevaluaciones_confianza_valor_check check (valor between 1 and 5);

-- Integridad del catálogo compartido. No cambia quién puede editarlo.
create unique index if not exists tipos_actividad_nombre_unico
  on public.tipos_actividad(lower(btrim(nombre)));
create unique index if not exists unidades_orden_unico on public.unidades(orden);
create unique index if not exists actividades_orden_unico_por_unidad
  on public.actividades(unidad_id, orden);
create unique index if not exists actividades_titulo_unico_por_unidad
  on public.actividades(unidad_id, lower(btrim(titulo)));

update public.unidades
set reto_comunicativo = 'Sintetizar la idea central de un texto extenso en cinco líneas.'
where orden = 1;

update public.actividades
set titulo = replace(titulo, 'Ideas principal, secundaria y terciaria', 'Ideas principales, secundarias y terciarias')
where titulo like 'Ideas principal, secundaria y terciaria%';

-- Se conservan las cuatro categorías solicitadas. Solo se corrige el ejemplo
-- que estaba marcado como formal pese a su registro conversacional.
update public.actividades
set contenido = jsonb_set(
  contenido,
  '{elementos}',
  coalesce((
    select jsonb_agg(
      case
        when elem ->> 'texto' = 'No profe, yo no quero revisar la acentuación; solo sé que algunas palabras llevan un palito.'
          then jsonb_set(elem, '{categoria_correcta}', to_jsonb('Inculto informal'::text))
        else elem
      end
      order by ord
    )
    from jsonb_array_elements(contenido -> 'elementos') with ordinality as x(elem, ord)
  ), '[]'::jsonb)
)
where id = 'c1696cc5-128e-41b0-abac-999fecef94f4'::uuid
  and jsonb_typeof(contenido -> 'elementos') = 'array'
  and exists (
    select 1 from jsonb_array_elements(contenido -> 'elementos') elem
    where elem ->> 'texto' = 'No profe, yo no quero revisar la acentuación; solo sé que algunas palabras llevan un palito.'
      and elem ->> 'categoria_correcta' = 'Inculto formal'
  );

update public.faq_articulos
set resumen = 'Comprueba el grupo, tu nombre y el NIP antes de pedir ayuda.',
    pasos = '["Usa el código exacto de tu grupo y escribe tu nombre como aparece en la lista.","En tu primer ingreso, usa los últimos cuatro dígitos de tu boleta; después entra con el NIP que tú creaste.","Si olvidaste el NIP, pide a tu docente que restablezca tu acceso y te entregue un NIP temporal."]'::jsonb,
    updated_at = now()
where slug = 'estudiante-acceso';

update public.faq_articulos
set resumen = 'Identifica si el bloqueo es por una dependencia, un intento agotado o un error técnico.',
    pasos = '["Guarda tu respuesta y la reflexión antes de avanzar.","Si existe una dependencia, completa la actividad anterior y su reflexión.","Sin variante hay un intento; una variante alternativa permite un segundo intento con otro ejercicio. Con 70% o más es opcional; con menos de 70% debes resolverlo antes de guardar la reflexión y continuar. Los niveles son actividades distintas y no cambian esta regla."]'::jsonb,
    updated_at = now()
where slug = 'estudiante-actividad';

update public.faq_articulos
set titulo = 'Problema con el acceso estudiantil',
    resumen = 'Revisa la lista, los duplicados y la ficha del estudiante antes de cambiar datos.',
    pasos = '["Confirma nombre y boleta.","Corrige filas incompletas o duplicadas.","Restablece el acceso y entrega el NIP temporal de forma privada."]'::jsonb,
    preguntas = '[{"id":"causa","pregunta":"¿Qué necesitas resolver?","opciones":[{"id":"carga","etiqueta":"No aparecen tras cargar el archivo"},{"id":"duplicado","etiqueta":"Hay estudiantes duplicados"},{"id":"nip","etiqueta":"Necesito restablecer un acceso"}]}]'::jsonb,
    updated_at = now()
where slug = 'docente-estudiantes';

create or replace function public.estudiante_actual()
returns uuid language sql stable security definer set search_path = public
as $$
  select e.id
  from public.estudiantes e
  where e.auth_user_id = auth.uid()
    and e.activo = true
    and e.debe_cambiar_nip = false
$$;

create or replace function public.grupo_del_estudiante_actual()
returns uuid language sql stable security definer set search_path = public
as $$ select grupo_id from public.estudiantes where id = public.estudiante_actual() $$;

drop policy if exists "docente o estudiante lee estudiantes permitidos" on public.estudiantes;
create policy "docente o estudiante lee estudiantes permitidos" on public.estudiantes
for select to authenticated using (
  grupo_id in (select id from public.grupos where docente_id = (select auth.uid()))
  or (auth_user_id = (select auth.uid()) and activo = true and debe_cambiar_nip = false)
);

create or replace function private.controlar_rate_limit_ingreso()
returns void language plpgsql security definer set search_path = private, pg_catalog
as $$
declare
  v_path text := current_setting('request.path', true);
  v_method text := current_setting('request.method', true);
  v_headers jsonb := '{}'::jsonb;
  v_subject text := nullif(current_setting('request.jwt.claim.sub', true), '');
  v_ip_text text;
  v_clave text;
  v_limite int;
  v_intentos int;
begin
  if v_method <> 'POST' or v_path is null
     or (v_path not like '%/rpc/ingresar_estudiante'
         and v_path not like '%/rpc/completar_perfil_docente') then return; end if;
  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  exception when others then
    v_headers := '{}'::jsonb;
  end;
  v_ip_text := nullif(btrim(coalesce(v_headers ->> 'cf-connecting-ip', v_headers ->> 'x-nf-client-connection-ip', '')), '');
  if v_subject !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then v_subject := null; end if;
  if v_ip_text is null and v_subject is null then
    raise sqlstate 'PGRST' using
      message = json_build_object('code', 'INGRESO_RATE_LIMIT', 'message', 'No pudimos validar el origen de la solicitud.')::text,
      detail = json_build_object('status', 429, 'status_text', 'Too Many Requests')::text;
  end if;
  delete from private.ingreso_rate_limits_claves where actualizado_en < now() - interval '1 day';
  for v_clave, v_limite in
    select clave, limite from (values
      (case when v_ip_text is not null then 'red:' || v_ip_text end, 180),
      (case when v_subject is not null then 'usuario:' || v_subject end, 30)
    ) as limites(clave, limite) where clave is not null
  loop
    insert into private.ingreso_rate_limits_claves (clave, ventana_inicio, intentos, actualizado_en)
    values (v_clave, now(), 1, now())
    on conflict (clave) do update set
      intentos = case when private.ingreso_rate_limits_claves.actualizado_en < now() - interval '5 minutes' then 1 else private.ingreso_rate_limits_claves.intentos + 1 end,
      ventana_inicio = case when private.ingreso_rate_limits_claves.actualizado_en < now() - interval '5 minutes' then now() else private.ingreso_rate_limits_claves.ventana_inicio end,
      actualizado_en = now()
    returning intentos into v_intentos;
    if v_intentos > v_limite then
      raise sqlstate 'PGRST' using
        message = json_build_object('code', 'INGRESO_RATE_LIMIT', 'message', 'Demasiadas solicitudes de ingreso. Intenta de nuevo en unos minutos.')::text,
        detail = json_build_object('status', 429, 'status_text', 'Too Many Requests')::text;
    end if;
  end loop;
end;
$$;

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

create or replace function public.agregar_estudiantes_con_boleta(p_grupo_id uuid, p_estudiantes jsonb)
returns integer language plpgsql security definer set search_path = public, extensions
as $$
declare v_item jsonb; v_nombre text; v_boleta text; v_creados integer := 0;
begin
  if not public.es_docente_activo() then raise exception 'Se requiere una cuenta docente confirmada.'; end if;
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
  if not public.es_docente_activo() then raise exception 'Se requiere una cuenta docente confirmada.'; end if;
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

-- Registra la orientación y, si corresponde, marca la entrega como atendida
-- dentro de la misma transacción. La función es invoker para que auth.uid()
-- y las policies de docente se apliquen también al endpoint RPC.
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
declare v_estado_entrega text;
begin
  if auth.uid() is null then raise exception 'Tu sesión expiró. Entra de nuevo para continuar.'; end if;
  if not public.es_docente_activo() then raise exception 'Se requiere una cuenta docente confirmada.'; end if;
  if p_estado_apoyo is not null and p_estado_apoyo not in ('logrado', 'en_proceso', 'necesita_apoyo') then raise exception 'La señal de apoyo no es válida.'; end if;
  if length(coalesce(p_comentario, '')) > 2000 then raise exception 'La orientación no puede superar 2000 caracteres.'; end if;
  select en.estado into v_estado_entrega
    from public.entregas en
    join public.estudiantes e on e.id = en.estudiante_id
    join public.grupos g on g.id = e.grupo_id
   where en.id = p_entrega_id and g.docente_id = auth.uid()
   for update;
  if not found then raise exception 'No tienes permiso para acompañar esta entrega.'; end if;
  if btrim(coalesce(p_comentario, '')) <> '' then
    insert into public.retroalimentacion_docente (entrega_id, docente_id, comentario)
    values (p_entrega_id, auth.uid(), btrim(p_comentario));
  end if;
  update public.entregas
     set evaluacion_docente = p_estado_apoyo,
         estado = case when coalesce(p_marcar_atendida, false) and v_estado_entrega = 'pendiente_revision' then 'revisada' else estado end
   where id = p_entrega_id;
end;
$$;

-- No se reinterpreta una respuesta histórica al cambiar el contenido de una
-- actividad que ya tiene entregas. El video de apoyo sigue siendo editable.
create or replace function public.proteger_actividad_con_entregas()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if (new.tipo_id is distinct from old.tipo_id or (new.contenido - 'instrucciones_momentos') is distinct from (old.contenido - 'instrucciones_momentos'))
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

create or replace function public.validar_invitacion_alta_docente()
returns trigger language plpgsql security definer set search_path = public, extensions, private, pg_catalog
as $$
declare v_hash text; v_codigo text;
begin
  if coalesce(new.is_anonymous, false) then return new; end if;
  v_codigo := new.raw_user_meta_data ->> 'codigo_invitacion_docente';
  select valor into v_hash from public.configuracion_plataforma where clave = 'codigo_invitacion_docente_hash';
  if length(trim(coalesce(v_codigo, ''))) < 4
     or length(trim(coalesce(v_codigo, ''))) > 64
     or v_hash is null
     or extensions.crypt(trim(coalesce(v_codigo, '')), v_hash) <> v_hash then
    raise exception 'El código de invitación no es correcto.';
  end if;
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'codigo_invitacion_docente';
  insert into private.altas_docente_autorizadas (usuario_id, autorizado_en, expira_en, usado_en)
  values (new.id, now(), now() + interval '24 hours', null)
  on conflict (usuario_id) do update
  set autorizado_en = excluded.autorizado_en, expira_en = excluded.expira_en, usado_en = null;
  return new;
end;
$$;

drop function if exists public.crear_perfil_docente(text, text);
create or replace function public.completar_perfil_docente(p_nombre text)
returns text language plpgsql security definer set search_path = public, private, auth, pg_catalog
as $$
declare v_correo text; v_email_confirmado timestamptz; v_autorizacion record;
begin
  if auth.uid() is null then raise exception 'Sesión inválida, intenta de nuevo'; end if;
  if coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true' then raise exception 'Se requiere una cuenta docente confirmada.'; end if;
  select email, email_confirmed_at into v_correo, v_email_confirmado from auth.users where id = auth.uid();
  if exists (select 1 from public.administradores a where a.id = auth.uid()) then raise exception 'Esta cuenta tiene acceso administrativo y no se puede registrar como docente.'; end if;
  if v_email_confirmado is null then raise exception 'Confirma tu correo antes de continuar.'; end if;
  if p_nombre is null or length(trim(p_nombre)) = 0 or length(p_nombre) > 200 then raise exception 'Escribe tu nombre.'; end if;
  select * into v_autorizacion from private.altas_docente_autorizadas where usuario_id = auth.uid() for update;
  if v_autorizacion.usuario_id is null or v_autorizacion.usado_en is not null or v_autorizacion.expira_en <= now() then
    raise exception 'La invitación de esta cuenta ya no es válida. Crea una cuenta nueva con una invitación vigente.';
  end if;
  insert into public.docentes (id, nombre, correo) values (auth.uid(), trim(p_nombre), v_correo) on conflict (id) do nothing;
  update private.altas_docente_autorizadas set usado_en = now() where usuario_id = auth.uid();
  return null;
end;
$$;

-- Las respuestas históricas conservan su clave, pero una docente puede
-- reparar los enlaces de una comparación de videos aunque ya haya entregas.
create or replace function public.proteger_actividad_con_entregas()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if (
       new.tipo_id is distinct from old.tipo_id
       or (
         ((new.contenido - 'instrucciones_momentos') #- '{video_bien,url}') #- '{video_mal,url}'
       ) is distinct from (
         ((old.contenido - 'instrucciones_momentos') #- '{video_bien,url}') #- '{video_mal,url}'
       )
     )
     and exists (select 1 from public.entregas where actividad_id = old.id) then
    raise exception 'Esta actividad ya tiene entregas y su tipo o contenido no se puede modificar.';
  end if;
  return new;
end;
$$;

create or replace function public.crear_actividad_docente(
  p_unidad_id uuid, p_tipo_id uuid, p_titulo text, p_instrucciones text,
  p_aprendizaje_esperado text, p_video_url text, p_contenido jsonb
)
returns uuid language plpgsql security definer set search_path = public, pg_catalog
as $$
declare v_id uuid; v_orden int; v_titulo text := btrim(coalesce(p_titulo, ''));
begin
  if not public.es_docente_activo() then raise exception 'Se requiere una cuenta docente confirmada.'; end if;
  if not exists (select 1 from public.unidades where id = p_unidad_id) then raise exception 'La unidad no es válida.'; end if;
  if not exists (select 1 from public.tipos_actividad where id = p_tipo_id) then raise exception 'El tipo de actividad no es válido.'; end if;
  if length(v_titulo) not between 1 and 160 then raise exception 'El título debe tener entre 1 y 160 caracteres.'; end if;
  if length(btrim(coalesce(p_instrucciones, ''))) not between 1 and 3000 then raise exception 'Las instrucciones deben tener entre 1 y 3000 caracteres.'; end if;
  if length(coalesce(p_aprendizaje_esperado, '')) > 800 then raise exception 'El aprendizaje esperado no puede superar 800 caracteres.'; end if;
  if length(coalesce(p_contenido, '{}'::jsonb)::text) > 50000 then raise exception 'El contenido de la actividad es demasiado extenso.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_unidad_id::text, 0));
  if exists (select 1 from public.actividades where unidad_id = p_unidad_id and lower(btrim(titulo)) = lower(v_titulo)) then
    raise exception 'Ya existe una actividad con ese título en la unidad.';
  end if;
  select coalesce(max(orden), 0) + 1 into v_orden from public.actividades where unidad_id = p_unidad_id;
  insert into public.actividades (unidad_id, tipo_id, titulo, instrucciones, aprendizaje_esperado, video_url, contenido, orden)
  values (
    p_unidad_id, p_tipo_id, v_titulo, btrim(p_instrucciones), nullif(btrim(coalesce(p_aprendizaje_esperado, '')), ''),
    nullif(btrim(coalesce(p_video_url, '')), ''), coalesce(p_contenido, '{}'::jsonb), v_orden
  ) returning id into v_id;
  return v_id;
end;
$$;

-- El segundo intento existe solo cuando el catálogo publica una variante
-- alternativa. La comprobación vive en la misma transacción que la entrega.
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
  v_max_intentos integer;
begin
  if p_estudiante_id is null or p_actividad_id is null then
    raise exception 'La entrega no es válida.';
  end if;
  if p_respuesta is null or jsonb_typeof(p_respuesta) <> 'object' then
    raise exception 'La respuesta no es válida.';
  end if;
  if p_puntaje_auto is not null and (p_puntaje_auto < 0 or p_puntaje_auto > 100) then
    raise exception 'El puntaje no es válido.';
  end if;
  if p_estado not in ('completada', 'pendiente_revision') then
    raise exception 'El estado de la entrega no es válido.';
  end if;

  select case
           when jsonb_typeof(a.contenido -> 'reintento_alternativo') = 'object' then 2
           else 1
         end
    into v_max_intentos
    from public.actividades a
   where a.id = p_actividad_id;
  if not found then raise exception 'La actividad no es válida.'; end if;

  v_respuesta_limpia := public.sanitizar_respuesta_entrega(p_respuesta - '_meta');

  loop
    select * into v_entrega
    from public.entregas
    where estudiante_id = p_estudiante_id and actividad_id = p_actividad_id
    for update;

    if found then
      v_intentos_previos := 1;
      if v_entrega.respuesta is not null
         and jsonb_typeof(v_entrega.respuesta -> '_meta') = 'object' then
        v_intentos_texto := v_entrega.respuesta -> '_meta' ->> 'intentos';
        if v_intentos_texto ~ '^[1-9][0-9]*$' then v_intentos_previos := v_intentos_texto::integer; end if;
      end if;

      if v_intentos_previos >= v_max_intentos then
        if v_max_intentos = 2 then
          raise exception 'Ya usaste los 2 intentos de esta actividad.' using errcode = 'check_violation';
        end if;
        raise exception 'Ya registraste el único intento de esta actividad.' using errcode = 'check_violation';
      end if;

      v_intentos := v_intentos_previos + 1;
      v_mejor_puntaje := case
        when p_puntaje_auto is null then v_entrega.puntaje_auto
        else greatest(coalesce(v_entrega.puntaje_auto, 0), p_puntaje_auto)
      end;
      v_meta := jsonb_build_object(
        'intentos', v_intentos,
        'mejorPuntaje', v_mejor_puntaje,
        'ejercicio', 2
      );
      v_respuesta_cliente := v_respuesta_limpia || jsonb_build_object('_meta', v_meta);

      if p_puntaje_auto is not null
         and coalesce(v_entrega.puntaje_auto, -1) > p_puntaje_auto
         and v_entrega.respuesta is not null
         and jsonb_typeof(v_entrega.respuesta) = 'object' then
        -- Si el segundo puntaje es menor se conserva la respuesta del primer
        -- ejercicio, pero el contador global sí queda en dos intentos.
        v_respuesta_guardada := (v_entrega.respuesta - '_meta') || jsonb_build_object(
          '_meta',
          v_meta || jsonb_build_object('ejercicio', 1)
        );
      else
        v_respuesta_guardada := v_respuesta_cliente;
      end if;

      update public.entregas
      set respuesta = v_respuesta_guardada, estado = p_estado, puntaje_auto = v_mejor_puntaje
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
      v_meta := jsonb_build_object(
        'intentos', v_intentos,
        'mejorPuntaje', v_mejor_puntaje,
        'ejercicio', 1
      );
      v_respuesta_cliente := v_respuesta_limpia || jsonb_build_object('_meta', v_meta);
      insert into public.entregas (estudiante_id, actividad_id, respuesta, estado, puntaje_auto)
      values (p_estudiante_id, p_actividad_id, v_respuesta_cliente, p_estado, v_mejor_puntaje);
      intentos := v_intentos;
      mejor_puntaje := v_mejor_puntaje;
      puntaje_guardado := v_mejor_puntaje;
      respuesta_guardada := v_respuesta_cliente;
      respuesta_cliente := v_respuesta_cliente;
      return next;
      return;
    exception when unique_violation then
      null;
    end;
  end loop;
end;
$$;

revoke execute on function public.ingresar_estudiante(text, text, text) from public, anon;
grant execute on function public.ingresar_estudiante(text, text, text) to authenticated;
revoke execute on function public.cambiar_nip_estudiante(text, text) from public, anon;
grant execute on function public.cambiar_nip_estudiante(text, text) to authenticated;
revoke execute on function public.agregar_estudiantes_con_boleta(uuid, jsonb) from public, anon;
grant execute on function public.agregar_estudiantes_con_boleta(uuid, jsonb) to authenticated;
revoke execute on function public.reiniciar_nip_estudiante(uuid) from public, anon;
grant execute on function public.reiniciar_nip_estudiante(uuid) to authenticated;
revoke all on function public.validar_invitacion_alta_docente() from public, anon, authenticated;

commit;

