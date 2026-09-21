-- Los helpers de RLS no requieren ser endpoints RPC públicos. Se alojan en
-- private para que las policies los usen sin ampliar la superficie del Data API.

grant usage on schema private to authenticated;

create or replace function private.es_reportante_actual_de_reporte(p_reporte_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.reportes r
    where r.id = p_reporte_id and (
      r.reportante_id = (select auth.uid())
      or (r.reportante_tipo = 'estudiante' and r.estudiante_id = public.estudiante_actual())
      or (r.reportante_tipo = 'docente' and r.docente_id = (select auth.uid()) and public.es_docente_activo())
    )
  );
$$;
revoke all on function private.es_reportante_actual_de_reporte(uuid) from public, anon;
grant execute on function private.es_reportante_actual_de_reporte(uuid) to authenticated;

create or replace function private.puede_responder_reporte_actual(p_reporte_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select private.es_reportante_actual_de_reporte(p_reporte_id)
    and exists (
      select 1 from public.reportes r
      where r.id = p_reporte_id and r.estado <> 'cerrado'
    );
$$;
revoke all on function private.puede_responder_reporte_actual(uuid) from public, anon;
grant execute on function private.puede_responder_reporte_actual(uuid) to authenticated;

drop policy if exists "reportante o admin lee mensajes del reporte" on public.reporte_mensajes;
create policy "reportante o admin lee mensajes del reporte" on public.reporte_mensajes
  for select to authenticated using (
    public.es_administrador_activo() or (visible_para_reportante and private.es_reportante_actual_de_reporte(reporte_id))
  );

drop policy if exists "participante agrega mensaje al reporte" on public.reporte_mensajes;
create policy "participante agrega mensaje al reporte" on public.reporte_mensajes
  for insert to authenticated with check (
    (autor_tipo = 'reportante' and autor_id = (select auth.uid()) and visible_para_reportante and private.puede_responder_reporte_actual(reporte_id))
    or (autor_tipo = 'administrador' and autor_id = (select auth.uid()) and public.es_administrador_activo())
  );

create or replace function public.registrar_mensaje_reporte(p_reporte_id uuid, p_mensaje text)
returns table(id uuid) language plpgsql security invoker set search_path = public
as $$
declare
  v_estado text;
  v_admin boolean := public.es_administrador_activo();
  v_tipo text;
begin
  if auth.uid() is null then raise exception 'Sesión inválida.'; end if;
  if p_mensaje is null or length(trim(p_mensaje)) not between 2 and 2000 then raise exception 'El mensaje debe tener entre 2 y 2000 caracteres.'; end if;
  if not (v_admin or private.es_reportante_actual_de_reporte(p_reporte_id)) then raise exception 'No encontramos este reporte.'; end if;
  select r.estado into v_estado from public.reportes r where r.id = p_reporte_id;
  if v_estado = 'cerrado' then raise exception 'Este reporte ya está cerrado.'; end if;
  v_tipo := case when v_admin then 'administrador' else 'reportante' end;
  return query insert into public.reporte_mensajes (reporte_id, autor_id, autor_tipo, mensaje, visible_para_reportante)
    values (p_reporte_id, (select auth.uid()), v_tipo, trim(p_mensaje), true)
    returning reporte_mensajes.id;
end;
$$;
revoke execute on function public.registrar_mensaje_reporte(uuid, text) from public, anon;
grant execute on function public.registrar_mensaje_reporte(uuid, text) to authenticated;

drop function if exists public.puede_responder_reporte_actual(uuid);
drop function if exists public.es_reportante_actual_de_reporte(uuid);
