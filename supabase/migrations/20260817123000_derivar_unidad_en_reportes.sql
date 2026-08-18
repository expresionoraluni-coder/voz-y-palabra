-- Si la pantalla solo conoce la actividad, el servidor completa la unidad
-- desde la relación real y evita guardar un contexto incompleto o falsificado.

create or replace function public.registrar_reporte(
  p_reportante_tipo text, p_estudiante_id uuid, p_docente_id uuid,
  p_grupo_id uuid, p_unidad_id uuid, p_actividad_id uuid,
  p_categoria text, p_descripcion text, p_ruta text, p_contexto jsonb
)
returns table(id uuid, duplicado boolean)
language plpgsql security definer set search_path = public
as $$
declare
  v_existente uuid;
  v_prioridad text;
  v_unidad_id uuid := p_unidad_id;
  v_contexto jsonb := coalesce(p_contexto, '{}'::jsonb);
begin
  if auth.uid() is null then raise exception 'Sesión inválida, intenta de nuevo.'; end if;
  if p_reportante_tipo not in ('estudiante', 'docente') then raise exception 'El tipo de reporte no es válido.'; end if;
  if p_categoria not in ('acceso', 'actividad', 'avance', 'video', 'carga', 'contenido', 'orientacion', 'otro') then raise exception 'La categoría no es válida.'; end if;
  if p_descripcion is null or length(trim(p_descripcion)) not between 10 and 2000 then raise exception 'La descripción debe tener entre 10 y 2000 caracteres.'; end if;
  if p_ruta is not null and length(p_ruta) > 300 then raise exception 'La pantalla indicada no es válida.'; end if;
  if jsonb_typeof(v_contexto) <> 'object' or length(v_contexto::text) > 4000 then raise exception 'El contexto del reporte no es válido.'; end if;
  if p_unidad_id is not null and not exists (select 1 from public.unidades u where u.id = p_unidad_id) then raise exception 'La unidad del reporte no es válida.'; end if;
  if p_actividad_id is not null then
    select a.unidad_id into v_unidad_id
    from public.actividades a
    where a.id = p_actividad_id
      and (p_unidad_id is null or a.unidad_id = p_unidad_id);
    if v_unidad_id is null then raise exception 'La actividad del reporte no es válida.'; end if;
    v_contexto := jsonb_set(v_contexto, '{unidad_id}', to_jsonb(v_unidad_id::text), true);
  end if;

  if p_reportante_tipo = 'estudiante' then
    if p_estudiante_id is null or p_docente_id is not null then raise exception 'El reporte de estudiante no es válido.'; end if;
    if not exists (
      select 1 from public.estudiantes e
      where e.id = p_estudiante_id
        and e.auth_user_id = (select auth.uid())
        and e.activo = true
        and (p_grupo_id is null or p_grupo_id = e.grupo_id)
    ) then raise exception 'No tienes permiso para reportar ese contexto.'; end if;
  else
    if p_docente_id is null or p_estudiante_id is not null or p_docente_id <> (select auth.uid()) then raise exception 'El reporte de docente no es válido.'; end if;
    if not exists (select 1 from public.docentes d where d.id = (select auth.uid())) then raise exception 'No encontramos tu perfil docente.'; end if;
    if p_grupo_id is not null and not exists (select 1 from public.grupos g where g.id = p_grupo_id and g.docente_id = (select auth.uid())) then raise exception 'No tienes permiso para reportar ese grupo.'; end if;
  end if;

  select r.id into v_existente
  from public.reportes r
  where r.reportante_id = (select auth.uid())
    and r.categoria = p_categoria
    and coalesce(r.ruta, '') = coalesce(p_ruta, '')
    and r.estado in ('recibido', 'en_revision', 'necesita_informacion')
    and r.created_at >= now() - interval '24 hours'
  order by r.created_at desc
  limit 1;

  if v_existente is not null then
    return query select v_existente, true;
    return;
  end if;

  v_prioridad := case
    when p_categoria in ('acceso', 'avance') then 'alta'
    when p_categoria = 'orientacion' then 'baja'
    else 'normal'
  end;

  insert into public.reportes (
    reportante_id, reportante_tipo, estudiante_id, docente_id, grupo_id,
    unidad_id, actividad_id, categoria, descripcion, prioridad, ruta, contexto
  )
  values (
    (select auth.uid()), p_reportante_tipo, p_estudiante_id, p_docente_id, p_grupo_id,
    v_unidad_id, p_actividad_id, p_categoria, trim(p_descripcion), v_prioridad, p_ruta, v_contexto
  )
  returning public.reportes.id into v_existente;

  return query select v_existente, false;
end;
$$;

revoke execute on function public.registrar_reporte(text, uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb) from public, anon;
grant execute on function public.registrar_reporte(text, uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb) to authenticated;
