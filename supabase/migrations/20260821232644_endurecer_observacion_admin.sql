-- Refuerza el panel administrativo: sesión de servidor y lecturas MFA/AAL2.
-- No modifica la policy global de contenido docente entre perfiles.

create table if not exists public.admin_session_activity (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);
create index if not exists admin_session_activity_last_seen_idx on public.admin_session_activity(last_seen_at);
alter table public.admin_session_activity enable row level security;
revoke all on public.admin_session_activity from public, anon, authenticated;
grant all on public.admin_session_activity to service_role;

-- Todas las lecturas administrativas requieren cuenta permanente, correo
-- confirmado, factor TOTP verificado y AAL2.
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
drop policy if exists "administrador consulta historial de reportes" on public.reporte_eventos;
create policy "administrador consulta historial de reportes" on public.reporte_eventos
  for select to authenticated using (public.es_administrador_activo());
drop policy if exists "administrador observa docentes" on public.docentes;
create policy "administrador observa docentes" on public.docentes
  for select to authenticated using (public.es_administrador_activo());
drop policy if exists "administrador observa grupos" on public.grupos;
create policy "administrador observa grupos" on public.grupos
  for select to authenticated using (public.es_administrador_activo());
drop policy if exists "administrador observa estudiantes" on public.estudiantes;
create policy "administrador observa estudiantes" on public.estudiantes
  for select to authenticated using (public.es_administrador_activo());
drop policy if exists "administrador observa unidades" on public.unidades;
create policy "administrador observa unidades" on public.unidades
  for select to authenticated using (public.es_administrador_activo());
drop policy if exists "administrador observa actividades" on public.actividades;
create policy "administrador observa actividades" on public.actividades
  for select to authenticated using (public.es_administrador_activo());
drop policy if exists "administrador observa entregas" on public.entregas;
create policy "administrador observa entregas" on public.entregas
  for select to authenticated using (public.es_administrador_activo());
drop policy if exists "administrador observa reflexiones" on public.reflexiones;
create policy "administrador observa reflexiones" on public.reflexiones
  for select to authenticated using (public.es_administrador_activo());
drop policy if exists "administrador observa confianza" on public.autoevaluaciones_confianza;
create policy "administrador observa confianza" on public.autoevaluaciones_confianza
  for select to authenticated using (public.es_administrador_activo());
drop policy if exists "administrador observa insignias otorgadas" on public.insignias_otorgadas;
create policy "administrador observa insignias otorgadas" on public.insignias_otorgadas
  for select to authenticated using (public.es_administrador_activo());
drop policy if exists "administrador observa retroalimentación" on public.retroalimentacion_docente;
create policy "administrador observa retroalimentación" on public.retroalimentacion_docente
  for select to authenticated using (public.es_administrador_activo());
drop policy if exists "administrador observa avisos" on public.avisos;
create policy "administrador observa avisos" on public.avisos
  for select to authenticated using (public.es_administrador_activo());
drop policy if exists "administrador observa eventos" on public.eventos;
create policy "administrador observa eventos" on public.eventos
  for select to authenticated using (public.es_administrador_activo());
drop policy if exists "administrador observa bitácora" on public.bitacora;
create policy "administrador observa bitácora" on public.bitacora
  for select to authenticated using (public.es_administrador_activo());
