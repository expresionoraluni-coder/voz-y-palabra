-- Refuerza la única cuenta administrativa permanente y concentra el alta de
-- reportes en una función pequeña: deriva el reportante desde auth.uid(),
-- evita duplicados recientes y asigna una prioridad inicial.

create or replace function public.es_administrador_activo()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
      from public.administradores a
      join auth.users u on u.id = a.id
     where a.id = (select auth.uid())
       and a.activo = true
       and u.email_confirmed_at is not null
       and lower(u.email) = lower('digp.inv.ipn@gmail.com')
  );
$$;

revoke all on function public.es_administrador_activo() from public, anon;
grant execute on function public.es_administrador_activo() to authenticated;

create or replace function public.registrar_reporte(
  p_reportante_tipo text,
  p_estudiante_id uuid,
  p_docente_id uuid,
  p_grupo_id uuid,
  p_unidad_id uuid,
  p_actividad_id uuid,
  p_categoria text,
  p_descripcion text,
  p_ruta text,
  p_contexto jsonb
)
returns table(id uuid, duplicado boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existente uuid;
  v_prioridad text;
  v_contexto jsonb := coalesce(p_contexto, '{}'::jsonb);
begin
  if auth.uid() is null then
    raise exception 'Sesión inválida, intenta de nuevo.';
  end if;
  if p_reportante_tipo not in ('estudiante', 'docente') then
    raise exception 'El tipo de reporte no es válido.';
  end if;
  if p_categoria not in ('acceso', 'actividad', 'avance', 'video', 'carga', 'contenido', 'otro') then
    raise exception 'La categoría no es válida.';
  end if;
  if p_descripcion is null or length(trim(p_descripcion)) not between 10 and 2000 then
    raise exception 'La descripción debe tener entre 10 y 2000 caracteres.';
  end if;
  if p_ruta is not null and length(p_ruta) > 300 then
    raise exception 'La pantalla indicada no es válida.';
  end if;
  if jsonb_typeof(v_contexto) <> 'object' or length(v_contexto::text) > 4000 then
    raise exception 'El contexto del reporte no es válido.';
  end if;

  if p_reportante_tipo = 'estudiante' then
    if p_estudiante_id is null or p_docente_id is not null then
      raise exception 'El reporte de estudiante no es válido.';
    end if;
    if not exists (
      select 1 from public.estudiantes e
       where e.id = p_estudiante_id
         and e.auth_user_id = (select auth.uid())
         and e.activo = true
         and (p_grupo_id is null or p_grupo_id = e.grupo_id)
    ) then
      raise exception 'No tienes permiso para reportar ese contexto.';
    end if;
  else
    if p_docente_id is null or p_estudiante_id is not null or p_docente_id <> (select auth.uid()) then
      raise exception 'El reporte de docente no es válido.';
    end if;
    if not exists (select 1 from public.docentes d where d.id = (select auth.uid())) then
      raise exception 'No encontramos tu perfil docente.';
    end if;
    if p_grupo_id is not null and not exists (
      select 1 from public.grupos g where g.id = p_grupo_id and g.docente_id = (select auth.uid())
    ) then
      raise exception 'No tienes permiso para reportar ese grupo.';
    end if;
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

  v_prioridad := case when p_categoria in ('acceso', 'avance') then 'alta' else 'normal' end;

  insert into public.reportes (
    reportante_id, reportante_tipo, estudiante_id, docente_id, grupo_id,
    unidad_id, actividad_id, categoria, descripcion, prioridad, ruta, contexto
  ) values (
    (select auth.uid()), p_reportante_tipo, p_estudiante_id, p_docente_id, p_grupo_id,
    p_unidad_id, p_actividad_id, p_categoria, trim(p_descripcion), v_prioridad, p_ruta, v_contexto
  ) returning public.reportes.id into v_existente;

  return query select v_existente, false;
end;
$$;

revoke execute on function public.registrar_reporte(text, uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb) from public, anon;
grant execute on function public.registrar_reporte(text, uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb) to authenticated;

create or replace function public.proteger_reporte_atencion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.reportante_id is distinct from old.reportante_id
    or new.reportante_tipo is distinct from old.reportante_tipo
    or new.estudiante_id is distinct from old.estudiante_id
    or new.docente_id is distinct from old.docente_id
    or new.grupo_id is distinct from old.grupo_id
    or new.unidad_id is distinct from old.unidad_id
    or new.actividad_id is distinct from old.actividad_id
    or new.categoria is distinct from old.categoria
    or new.descripcion is distinct from old.descripcion
    or new.ruta is distinct from old.ruta
    or new.contexto is distinct from old.contexto
    or new.created_at is distinct from old.created_at then
    raise exception 'Los datos originales del reporte no se pueden modificar.';
  end if;

  if auth.uid() is not null and not public.es_administrador_activo() then
    raise exception 'No tienes permiso para atender reportes.';
  end if;
  if auth.uid() is not null and new.atendido_por is not null and new.atendido_por <> (select auth.uid()) then
    raise exception 'El reporte debe quedar atendido por la cuenta administrativa activa.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_reporte_atencion on public.reportes;
create trigger trg_proteger_reporte_atencion
before update on public.reportes
for each row execute function public.proteger_reporte_atencion();

revoke execute on function public.proteger_reporte_atencion() from public, anon, authenticated;

drop policy if exists "administrador ve su perfil" on public.administradores;
create policy "administrador ve su perfil" on public.administradores
  for select to authenticated
  using (id = (select auth.uid()) and public.es_administrador_activo());

drop policy if exists "reportes visibles para reportante o administrador" on public.reportes;
create policy "reportes visibles para reportante o administrador" on public.reportes
  for select to authenticated
  using (reportante_id = (select auth.uid()) or public.es_administrador_activo());

drop policy if exists "administrador atiende reportes" on public.reportes;
create policy "administrador atiende reportes" on public.reportes
  for update to authenticated
  using (public.es_administrador_activo())
  with check (public.es_administrador_activo() and (atendido_por is null or atendido_por = (select auth.uid())));

drop policy if exists "administrador observa docentes" on public.docentes;
create policy "administrador observa docentes" on public.docentes
  for select to authenticated using (public.es_administrador_activo());
drop policy if exists "administrador observa grupos" on public.grupos;
create policy "administrador observa grupos" on public.grupos
  for select to authenticated using (public.es_administrador_activo());
drop policy if exists "administrador observa estudiantes" on public.estudiantes;
create policy "administrador observa estudiantes" on public.estudiantes
  for select to authenticated using (public.es_administrador_activo());
