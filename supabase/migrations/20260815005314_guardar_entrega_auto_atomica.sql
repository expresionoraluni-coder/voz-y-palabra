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
