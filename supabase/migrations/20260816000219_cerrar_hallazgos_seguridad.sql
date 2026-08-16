-- Cierre de hallazgos de la auditoría de seguridad.
-- Mantiene el acceso de estudiantes anónimos autenticados como role
-- authenticated, pero elimina el alcance accidental de PUBLIC.

do $$
declare
  v_policy record;
begin
  for v_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  loop
    execute format(
      'alter policy %I on %I.%I to authenticated',
      v_policy.policyname,
      v_policy.schemaname,
      v_policy.tablename
    );
  end loop;
end;
$$;

-- El índice único y los índices de relación deben quedar también en una
-- reconstrucción desde cero. Son idempotentes para la base existente.
create index if not exists actividades_tipo_id_idx on public.actividades(tipo_id);
create index if not exists actividades_unidad_id_idx on public.actividades(unidad_id);
create index if not exists autoevaluaciones_confianza_unidad_id_idx on public.autoevaluaciones_confianza(unidad_id);
create index if not exists avisos_docente_id_idx on public.avisos(docente_id);
create index if not exists avisos_grupo_id_idx on public.avisos(grupo_id);
create index if not exists avisos_unidad_id_idx on public.avisos(unidad_id);
create index if not exists bitacora_unidad_id_idx on public.bitacora(unidad_id);
create index if not exists entregas_actividad_id_idx on public.entregas(actividad_id);
create index if not exists eventos_docente_id_idx on public.eventos(docente_id);
create index if not exists eventos_grupo_id_idx on public.eventos(grupo_id);
create index if not exists eventos_unidad_id_idx on public.eventos(unidad_id);
create index if not exists grupos_docente_id_idx on public.grupos(docente_id);
create index if not exists insignias_otorgadas_insignia_id_idx on public.insignias_otorgadas(insignia_id);
create index if not exists reflexiones_actividad_id_idx on public.reflexiones(actividad_id);
create index if not exists reflexiones_unidad_id_idx on public.reflexiones(unidad_id);
create index if not exists retroalimentacion_docente_docente_id_idx on public.retroalimentacion_docente(docente_id);
create index if not exists retroalimentacion_docente_entrega_id_idx on public.retroalimentacion_docente(entrega_id);
create unique index if not exists estudiantes_boleta_unica_por_grupo
  on public.estudiantes(grupo_id, boleta)
  where boleta is not null;
create unique index if not exists estudiantes_nombre_unico_por_grupo
  on public.estudiantes(grupo_id, lower(trim(nombre)));
create unique index if not exists reflexiones_unica_por_actividad
  on public.reflexiones(estudiante_id, actividad_id, momento);
create unique index if not exists reflexiones_unica_por_unidad
  on public.reflexiones(estudiante_id, unidad_id, momento);

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.conname = 'actividades_video_url_https_check'
      and t.relname = 'actividades'
      and n.nspname = 'public'
  ) then
    alter table public.actividades
      add constraint actividades_video_url_https_check
      check (
        video_url is null
        or lower(video_url) ~ '^https://(www\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)(/|$)'
      );
  end if;
end;
$$;

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
  if length(trim(coalesce(p_codigo, ''))) < 4 or length(trim(coalesce(p_codigo, ''))) > 64 then
    raise exception 'El código de grupo no es válido.';
  end if;
  if p_nombre is null or length(trim(p_nombre)) = 0 or length(p_nombre) > 200 then
    raise exception 'Escribe tu nombre completo.';
  end if;
  if coalesce(p_nip, '') !~ '^[0-9]{4}$' then raise exception 'Tu NIP debe ser de 4 dígitos.'; end if;

  select g.id, g.nombre
    into v_grupo
    from public.grupos g
   where g.codigo_acceso = trim(p_codigo)
     and g.activo = true;
  if v_grupo.id is null then
    perform pg_sleep(0.5);
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos;
    return;
  end if;

  select *
    into v_intentos_nombre
    from public.intentos_nombre_estudiante
   where usuario_id = auth.uid();
  if v_intentos_nombre.bloqueado_hasta is not null and v_intentos_nombre.bloqueado_hasta > now() then
    return query
      select null::uuid, null::text, null::uuid, null::text, null::boolean,
        format('Demasiados intentos. Espera %s minutos e intenta de nuevo.', greatest(1, ceil(extract(epoch from (v_intentos_nombre.bloqueado_hasta - now())) / 60)))::text;
    return;
  end if;

  select e.id, e.nombre, e.nip_hash, e.activo, e.intentos_fallidos, e.bloqueado_hasta
    into v_estudiante
    from public.estudiantes e
   where e.grupo_id = v_grupo.id
     and public.normalizar_nombre(e.nombre) = public.normalizar_nombre(p_nombre)
   for update;

  if v_estudiante.id is null then
    insert into public.intentos_nombre_estudiante (usuario_id, intentos, bloqueado_hasta)
    values (auth.uid(), 1, null)
    on conflict (usuario_id) do update
      set intentos = public.intentos_nombre_estudiante.intentos + 1,
          bloqueado_hasta = case
            when public.intentos_nombre_estudiante.intentos + 1 >= v_max_intentos
              then now() + (v_minutos_bloqueo || ' minutes')::interval
            else public.intentos_nombre_estudiante.bloqueado_hasta
          end;
    insert into public.intentos_nombre_grupo as ing (grupo_id, intentos, ventana_inicio)
    values (v_grupo.id, 1, now())
    on conflict (grupo_id) do update
      set intentos = case when now() - ing.ventana_inicio > interval '5 minutes' then 1 else ing.intentos + 1 end,
          ventana_inicio = case when now() - ing.ventana_inicio > interval '5 minutes' then now() else ing.ventana_inicio end
    returning ing.intentos into v_intentos_grupo_actual;
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
    return query
      select null::uuid, null::text, null::uuid, null::text, null::boolean,
        format('Demasiados intentos. Espera %s minutos e intenta de nuevo.', greatest(1, ceil(extract(epoch from (v_estudiante.bloqueado_hasta - now())) / 60)))::text;
    return;
  end if;

  delete from public.intentos_nombre_estudiante where usuario_id = auth.uid();
  if v_estudiante.nip_hash is null then
    update public.estudiantes
       set auth_user_id = null
     where auth_user_id = auth.uid()
       and public.estudiantes.id <> v_estudiante.id;
    update public.estudiantes
       set auth_user_id = auth.uid(),
           nip_hash = extensions.crypt(p_nip, extensions.gen_salt('bf')),
           intentos_fallidos = 0,
           bloqueado_hasta = null
     where public.estudiantes.id = v_estudiante.id;
    return query select v_estudiante.id, v_estudiante.nombre, v_grupo.id, v_grupo.nombre, true, null::text;
    return;
  end if;

  if extensions.crypt(p_nip, v_estudiante.nip_hash) <> v_estudiante.nip_hash then
    update public.estudiantes
       set intentos_fallidos = v_estudiante.intentos_fallidos + 1,
           bloqueado_hasta = case
             when v_estudiante.intentos_fallidos + 1 >= v_max_intentos
               then now() + (v_minutos_bloqueo || ' minutes')::interval
             else bloqueado_hasta
           end
     where public.estudiantes.id = v_estudiante.id;
    perform pg_sleep(0.5);
    return query select null::uuid, null::text, null::uuid, null::text, null::boolean, v_error_datos;
    return;
  end if;

  update public.estudiantes
     set auth_user_id = null
   where auth_user_id = auth.uid()
   and public.estudiantes.id <> v_estudiante.id;
  update public.estudiantes
     set auth_user_id = auth.uid(),
         intentos_fallidos = 0,
         bloqueado_hasta = null
   where public.estudiantes.id = v_estudiante.id;
  return query select v_estudiante.id, v_estudiante.nombre, v_grupo.id, v_grupo.nombre, false, null::text;
end;
$$;

create or replace function public.cambiar_nip_estudiante(p_nip_actual text, p_nip_nuevo text)
returns text language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_estudiante record;
  v_max_intentos constant int := 5;
  v_minutos_bloqueo constant int := 15;
begin
  if auth.uid() is null then raise exception 'Sesión inválida, intenta de nuevo'; end if;
  if coalesce(p_nip_actual, '') !~ '^[0-9]{4}$' then return 'Tu NIP actual no es correcto.'; end if;
  if coalesce(p_nip_nuevo, '') !~ '^[0-9]{4}$' then raise exception 'Tu nuevo NIP debe ser de 4 dígitos.'; end if;

  select id, nip_hash, intentos_fallidos, bloqueado_hasta
    into v_estudiante
    from public.estudiantes
   where auth_user_id = auth.uid()
   for update;
  if v_estudiante.id is null then raise exception 'No encontramos tu sesión de estudiante, intenta entrar de nuevo.'; end if;
  if v_estudiante.bloqueado_hasta is not null and v_estudiante.bloqueado_hasta > now() then
    return format(
      'Demasiados intentos. Espera %s minutos e intenta de nuevo.',
      greatest(1, ceil(extract(epoch from (v_estudiante.bloqueado_hasta - now())) / 60))
    );
  end if;
  if extensions.crypt(p_nip_actual, v_estudiante.nip_hash) <> v_estudiante.nip_hash then
    update public.estudiantes
       set intentos_fallidos = v_estudiante.intentos_fallidos + 1,
           bloqueado_hasta = case
             when v_estudiante.intentos_fallidos + 1 >= v_max_intentos
               then now() + (v_minutos_bloqueo || ' minutes')::interval
             else bloqueado_hasta
           end
     where id = v_estudiante.id;
    perform pg_sleep(0.5);
    return 'Tu NIP actual no es correcto.';
  end if;
  update public.estudiantes
     set nip_hash = extensions.crypt(p_nip_nuevo, extensions.gen_salt('bf')),
         intentos_fallidos = 0,
         bloqueado_hasta = null,
         debe_cambiar_nip = false
   where id = v_estudiante.id;
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
  if not exists (
    select 1
    from public.estudiantes e
    join public.grupos g on g.id = e.grupo_id
    where e.id = p_estudiante_id
      and g.docente_id = auth.uid()
  ) then
    raise exception 'No tienes permiso sobre este estudiante.';
  end if;

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

revoke execute on function public.reiniciar_nip_estudiante(uuid) from public, anon;
grant execute on function public.reiniciar_nip_estudiante(uuid) to authenticated;

-- estudiante_tiene_nip fue un RPC de una etapa anterior y no tiene callers.
-- Se elimina de la superficie expuesta para que no quede una puerta legacy en
-- una reconstrucción o en el Data API.
drop function if exists public.estudiante_tiene_nip(text, text);

revoke execute on function public.normalizar_nombre(text) from public, anon, authenticated;
revoke execute on function public.estudiante_actual() from public, anon;
grant execute on function public.estudiante_actual() to authenticated;
revoke execute on function public.grupo_del_estudiante_actual() from public, anon;
grant execute on function public.grupo_del_estudiante_actual() to authenticated;
revoke execute on function public.verificar_insignias() from public, anon;
grant execute on function public.verificar_insignias() to authenticated;
revoke execute on function public.crear_perfil_docente(text, text) from public, anon;
grant execute on function public.crear_perfil_docente(text, text) to authenticated;
revoke execute on function public.ingresar_estudiante(text, text, text) from public, anon;
grant execute on function public.ingresar_estudiante(text, text, text) to authenticated;
revoke execute on function public.cambiar_nip_estudiante(text, text) from public, anon;
grant execute on function public.cambiar_nip_estudiante(text, text) to authenticated;
