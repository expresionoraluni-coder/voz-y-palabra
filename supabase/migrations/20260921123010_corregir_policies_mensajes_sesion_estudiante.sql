-- Las tablas de reportes exponen únicamente columnas operativas al Data API.
-- Las policies de conversación usan helpers SECURITY DEFINER para conservar
-- ese mínimo privilegio al resolver la propiedad del caso.

create or replace function public.es_reportante_actual_de_reporte(p_reporte_id uuid)
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
revoke all on function public.es_reportante_actual_de_reporte(uuid) from public, anon;
grant execute on function public.es_reportante_actual_de_reporte(uuid) to authenticated;

create or replace function public.puede_responder_reporte_actual(p_reporte_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.es_reportante_actual_de_reporte(p_reporte_id)
    and exists (
      select 1 from public.reportes r
      where r.id = p_reporte_id and r.estado <> 'cerrado'
    );
$$;
revoke all on function public.puede_responder_reporte_actual(uuid) from public, anon;
grant execute on function public.puede_responder_reporte_actual(uuid) to authenticated;

drop policy if exists "reportante o admin lee mensajes del reporte" on public.reporte_mensajes;
create policy "reportante o admin lee mensajes del reporte" on public.reporte_mensajes
  for select to authenticated using (
    public.es_administrador_activo() or (visible_para_reportante and public.es_reportante_actual_de_reporte(reporte_id))
  );

drop policy if exists "participante agrega mensaje al reporte" on public.reporte_mensajes;
create policy "participante agrega mensaje al reporte" on public.reporte_mensajes
  for insert to authenticated with check (
    (autor_tipo = 'reportante' and autor_id = (select auth.uid()) and visible_para_reportante and public.puede_responder_reporte_actual(reporte_id))
    or (autor_tipo = 'administrador' and autor_id = (select auth.uid()) and public.es_administrador_activo())
  );
