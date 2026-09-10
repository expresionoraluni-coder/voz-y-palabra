-- Cambios seguros de la auditoría: no elimina estudiantes ni entregas.
-- La migración se detiene si los datos actuales contienen homónimos que
-- colisionarían después de aplicar la normalización canónica.
do $$
begin
  if exists (
    select 1
      from public.estudiantes
     group by grupo_id, public.normalizar_nombre(nombre)
    having count(*) > 1
  ) then
    raise exception 'No se puede unificar el índice de nombres: existen homónimos normalizados. Revisión manual requerida.';
  end if;
end;
$$;

drop index if exists public.estudiantes_nombre_unico_por_grupo;
create unique index estudiantes_nombre_unico_por_grupo
  on public.estudiantes (grupo_id, public.normalizar_nombre(nombre));

create or replace function public.grupo_del_estudiante_actual()
returns uuid language sql stable security definer set search_path = public
as $$
  select grupo_id
    from public.estudiantes
   where id = public.estudiante_actual()
     and activo = true;
$$;

create or replace function public.entrega_cuenta_como_completada(
  p_contenido jsonb,
  p_puntaje_auto integer,
  p_respuesta jsonb
)
returns boolean
language sql immutable
set search_path = public
as $$
  select (
    (p_contenido -> 'reintento_alternativo') is null
    or p_puntaje_auto is null
    or p_puntaje_auto >= 70
    or coalesce((p_respuesta -> '_meta' ->> 'intentos') ~ '^[2-9][0-9]*$', false)
  );
$$;

revoke execute on function public.entrega_cuenta_como_completada(jsonb, integer, jsonb) from public, anon, authenticated;

drop function if exists public.reiniciar_nip_estudiante(uuid);
create function public.reiniciar_nip_estudiante(p_estudiante_id uuid)
returns text language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_nip_temporal text;
  v_bytes bytea;
  v_valor integer;
begin
  if not public.es_docente_activo() then raise exception 'Se requiere una cuenta docente confirmada.'; end if;
  if not exists (select 1 from public.estudiantes e join public.grupos g on g.id = e.grupo_id where e.id = p_estudiante_id and g.docente_id = auth.uid()) then raise exception 'No tienes permiso sobre este estudiante.'; end if;
  loop
    v_bytes := extensions.gen_random_bytes(2);
    v_valor := get_byte(v_bytes, 0) * 256 + get_byte(v_bytes, 1);
    exit when v_valor < 63000;
  end loop;
  v_nip_temporal := (1000 + v_valor % 9000)::text;
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

-- La ruta vigente usa completar_perfil_docente(). Se conserva la función
-- antigua para no romper aprovisionamientos históricos, pero se retira del
-- Data API para evitar una segunda vía de alta con reglas distintas.
revoke execute on function public.crear_perfil_docente(text, text) from public, anon, authenticated;
