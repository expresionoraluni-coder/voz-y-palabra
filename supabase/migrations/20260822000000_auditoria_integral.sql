begin;

-- El pre-request de PostgREST ejecuta esta función con el rol authenticator.
-- La identidad anónima puede cambiar, así que el límite principal se liga a
-- la red y se conserva un límite secundario por sesión.
grant usage on schema private to authenticator;

create or replace function private.controlar_rate_limit_ingreso()
returns void
language plpgsql
security definer
set search_path = private, pg_catalog
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
         and v_path not like '%/rpc/crear_perfil_docente') then
    return;
  end if;

  begin
    v_headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  exception when others then
    v_headers := '{}'::jsonb;
  end;

  v_ip_text := nullif(btrim(coalesce(v_headers ->> 'cf-connecting-ip', v_headers ->> 'x-nf-client-connection-ip', '')), '');
  if v_subject !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    v_subject := null;
  end if;
  if v_ip_text is null and v_subject is null then
    raise sqlstate 'PGRST' using
      message = json_build_object('code', 'INGRESO_RATE_LIMIT', 'message', 'No pudimos validar el origen de la solicitud.')::text,
      detail = json_build_object('status', 429, 'status_text', 'Too Many Requests')::text;
  end if;

  delete from private.ingreso_rate_limits_claves
   where actualizado_en < now() - interval '1 day';

  for v_clave, v_limite in
    select clave, limite
    from (values
      (case when v_ip_text is not null then 'red:' || v_ip_text end, 180),
      (case when v_subject is not null then 'usuario:' || v_subject end, 30)
    ) as limites(clave, limite)
    where clave is not null
  loop
    insert into private.ingreso_rate_limits_claves (clave, ventana_inicio, intentos, actualizado_en)
    values (v_clave, now(), 1, now())
    on conflict (clave) do update
      set intentos = case
        when private.ingreso_rate_limits_claves.actualizado_en < now() - interval '5 minutes' then 1
        else private.ingreso_rate_limits_claves.intentos + 1
      end,
      ventana_inicio = case
        when private.ingreso_rate_limits_claves.actualizado_en < now() - interval '5 minutes' then now()
        else private.ingreso_rate_limits_claves.ventana_inicio
      end,
      actualizado_en = now()
    returning intentos into v_intentos;

    if v_intentos > v_limite then
      raise sqlstate 'PGRST' using
        message = json_build_object(
          'code', 'INGRESO_RATE_LIMIT',
          'message', 'Demasiadas solicitudes de ingreso. Intenta de nuevo en unos minutos.')::text,
        detail = json_build_object('status', 429, 'status_text', 'Too Many Requests')::text;
    end if;
  end loop;
end;
$$;

revoke all on function private.controlar_rate_limit_ingreso() from public, anon, authenticated;
grant execute on function private.controlar_rate_limit_ingreso() to authenticator;
alter role authenticator set pgrst.db_pre_request = 'private.controlar_rate_limit_ingreso';
notify pgrst, 'reload config';

create or replace function public.sanitizar_respuesta_entrega(p_respuesta jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public, pg_catalog
as $$
declare
  v_resultado jsonb := '{}'::jsonb;
  v_item record;
begin
  if p_respuesta is null then return null; end if;
  if jsonb_typeof(p_respuesta) = 'array' then
    select coalesce(jsonb_agg(public.sanitizar_respuesta_entrega(value)), '[]'::jsonb)
      into v_resultado
      from jsonb_array_elements(p_respuesta);
    return v_resultado;
  end if;
  if jsonb_typeof(p_respuesta) <> 'object' then return p_respuesta; end if;

  for v_item in select key, value from jsonb_each(p_respuesta) loop
    if v_item.key in ('respuesta_correcta', 'opcionCorrecta', 'texto_correcto', 'itemsSnapshot')
       or (v_item.key = 'correcta' and jsonb_typeof(v_item.value) = 'string') then
      continue;
    end if;
    v_resultado := v_resultado || jsonb_build_object(v_item.key, public.sanitizar_respuesta_entrega(v_item.value));
  end loop;
  return v_resultado;
end;
$$;

revoke execute on function public.sanitizar_respuesta_entrega(jsonb) from public, anon, authenticated;
grant execute on function public.sanitizar_respuesta_entrega(jsonb) to service_role;

create or replace function public.proteger_columnas_entrega()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  new.respuesta := public.sanitizar_respuesta_entrega(new.respuesta);
  if tg_op = 'INSERT' then
    return new;
  end if;
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
    if auth.uid() is not null and new.evaluacion_docente is distinct from old.evaluacion_docente then
      raise exception 'No puedes modificar la evaluación de la docente.';
    end if;
    if new.estudiante_id is distinct from old.estudiante_id or new.actividad_id is distinct from old.actividad_id then
      raise exception 'No puedes reasignar esta entrega.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_entrega on public.entregas;
create trigger trg_proteger_entrega
before insert or update on public.entregas
for each row execute function public.proteger_columnas_entrega();

revoke execute on function public.proteger_columnas_entrega() from public, anon, authenticated;

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
  if p_estudiante_id is null or p_actividad_id is null then raise exception 'La entrega no es válida.'; end if;
  if p_respuesta is null or jsonb_typeof(p_respuesta) <> 'object' then raise exception 'La respuesta no es válida.'; end if;
  if p_puntaje_auto is not null and (p_puntaje_auto < 0 or p_puntaje_auto > 100) then raise exception 'El puntaje no es válido.'; end if;
  if p_estado not in ('completada', 'pendiente_revision') then raise exception 'El estado de la entrega no es válido.'; end if;

  v_respuesta_limpia := public.sanitizar_respuesta_entrega(p_respuesta - '_meta');

  loop
    select * into v_entrega from public.entregas
     where estudiante_id = p_estudiante_id and actividad_id = p_actividad_id for update;

    if found then
      v_intentos_previos := 1;
      if v_entrega.respuesta is not null and jsonb_typeof(v_entrega.respuesta -> '_meta') = 'object' then
        v_intentos_texto := v_entrega.respuesta -> '_meta' ->> 'intentos';
        if v_intentos_texto ~ '^[1-3]$' then v_intentos_previos := v_intentos_texto::integer; end if;
      end if;
      if v_intentos_previos >= 3 then
        raise exception 'Ya usaste los 3 intentos de esta actividad.' using errcode = 'check_violation';
      end if;

      v_intentos := v_intentos_previos + 1;
      v_mejor_puntaje := case
        when p_puntaje_auto is null then v_entrega.puntaje_auto
        else greatest(coalesce(v_entrega.puntaje_auto, 0), p_puntaje_auto)
      end;
      v_meta := jsonb_build_object('intentos', v_intentos, 'mejorPuntaje', v_mejor_puntaje);
      v_respuesta_cliente := v_respuesta_limpia || jsonb_build_object('_meta', v_meta);
      if p_puntaje_auto is not null and coalesce(v_entrega.puntaje_auto, -1) > p_puntaje_auto
        and v_entrega.respuesta is not null and jsonb_typeof(v_entrega.respuesta) = 'object' then
        v_respuesta_guardada := (public.sanitizar_respuesta_entrega(v_entrega.respuesta - '_meta')) || jsonb_build_object('_meta', v_meta);
      else
        v_respuesta_guardada := v_respuesta_cliente;
      end if;

      update public.entregas set respuesta = v_respuesta_guardada, estado = p_estado, puntaje_auto = v_mejor_puntaje where id = v_entrega.id;
      intentos := v_intentos; mejor_puntaje := v_mejor_puntaje; puntaje_guardado := v_mejor_puntaje;
      respuesta_guardada := v_respuesta_guardada; respuesta_cliente := v_respuesta_cliente;
      return next; return;
    end if;

    begin
      v_intentos := 1;
      v_mejor_puntaje := p_puntaje_auto;
      v_meta := jsonb_build_object('intentos', v_intentos, 'mejorPuntaje', v_mejor_puntaje);
      v_respuesta_cliente := v_respuesta_limpia || jsonb_build_object('_meta', v_meta);
      insert into public.entregas (estudiante_id, actividad_id, respuesta, estado, puntaje_auto)
      values (p_estudiante_id, p_actividad_id, v_respuesta_cliente, p_estado, v_mejor_puntaje);
      intentos := v_intentos; mejor_puntaje := v_mejor_puntaje; puntaje_guardado := v_mejor_puntaje;
      respuesta_guardada := v_respuesta_cliente; respuesta_cliente := v_respuesta_cliente;
      return next; return;
    exception when unique_violation then
      null;
    end;
  end loop;
end;
$$;

revoke execute on function public.guardar_entrega_auto(uuid, uuid, jsonb, integer, text) from public, anon, authenticated;
grant execute on function public.guardar_entrega_auto(uuid, uuid, jsonb, integer, text) to service_role;

drop policy if exists "administrador observa estudiantes" on public.estudiantes;

commit;
