-- Endurece las escrituras sensibles sin alterar el contenido global docente.
-- La limpieza de entregas históricas queda separada y requiere autorización
-- explícita porque modifica datos existentes.

revoke insert, update, delete on public.estudiantes from public, anon, authenticated;
revoke all on public.reflexiones from public, anon, authenticated;
grant select on public.reflexiones to authenticated;
revoke insert, update, delete on public.reflexiones from public, anon, authenticated;
grant all on public.reflexiones to service_role;

create or replace function public.sanitizar_respuesta_entrega(p_respuesta jsonb)
returns jsonb language plpgsql immutable set search_path = public, pg_catalog
as $$
declare v_resultado jsonb := '{}'::jsonb; v_item record;
begin
  if p_respuesta is null then return null; end if;
  if jsonb_typeof(p_respuesta) = 'array' then
    select coalesce(jsonb_agg(public.sanitizar_respuesta_entrega(value)), '[]'::jsonb)
      into v_resultado from jsonb_array_elements(p_respuesta);
    return v_resultado;
  end if;
  if jsonb_typeof(p_respuesta) <> 'object' then return p_respuesta; end if;
  for v_item in select key, value from jsonb_each(p_respuesta) loop
    if v_item.key in ('respuesta_correcta', 'opcionCorrecta', 'texto_correcto', 'itemsSnapshot')
       or (v_item.key = 'correcta' and jsonb_typeof(v_item.value) = 'string') then continue; end if;
    v_resultado := v_resultado || jsonb_build_object(v_item.key, public.sanitizar_respuesta_entrega(v_item.value));
  end loop;
  return v_resultado;
end;
$$;
revoke all on function public.sanitizar_respuesta_entrega(jsonb) from public, anon, authenticated;
grant execute on function public.sanitizar_respuesta_entrega(jsonb) to service_role;

create or replace function public.proteger_columnas_entrega()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  new.respuesta := public.sanitizar_respuesta_entrega(new.respuesta);
  if auth.uid() is not null and exists (
    select 1 from public.grupos g
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
create trigger trg_proteger_entrega before update on public.entregas for each row execute function public.proteger_columnas_entrega();
revoke execute on function public.proteger_columnas_entrega() from public, anon, authenticated;

create or replace function public.proteger_cuota_reportes()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null then
    perform pg_advisory_xact_lock(hashtext((select auth.uid())::text));
    if (select count(*) from public.reportes where reportante_id = (select auth.uid()) and created_at >= now() - interval '24 hours') >= 10 then
      raise exception 'Alcanzaste el límite diario de solicitudes. Revisa tus reportes abiertos antes de crear otro.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_proteger_cuota_reportes on public.reportes;
create trigger trg_proteger_cuota_reportes before insert on public.reportes for each row execute function public.proteger_cuota_reportes();
revoke execute on function public.proteger_cuota_reportes() from public, anon, authenticated;
