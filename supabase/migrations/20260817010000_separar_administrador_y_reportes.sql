-- Separa la cuenta administrativa de las cuentas docentes y crea la mesa
-- de atención. El primer administrador se incorpora manualmente mediante
-- una operación controlada; no existe registro administrativo público.

create table if not exists public.administradores (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.reportes (
  id uuid primary key default gen_random_uuid(),
  reportante_id uuid not null references auth.users(id) on delete cascade,
  reportante_tipo text not null check (reportante_tipo in ('estudiante', 'docente')),
  estudiante_id uuid references public.estudiantes(id) on delete set null,
  docente_id uuid references public.docentes(id) on delete set null,
  grupo_id uuid references public.grupos(id) on delete set null,
  unidad_id uuid references public.unidades(id) on delete set null,
  actividad_id uuid references public.actividades(id) on delete set null,
  categoria text not null check (categoria in ('acceso', 'actividad', 'avance', 'video', 'carga', 'contenido', 'otro')),
  descripcion text not null check (length(trim(descripcion)) between 10 and 2000),
  estado text not null default 'recibido' check (estado in ('recibido', 'en_revision', 'necesita_informacion', 'resuelto', 'cerrado')),
  prioridad text not null default 'normal' check (prioridad in ('baja', 'normal', 'alta', 'urgente')),
  ruta text check (ruta is null or length(ruta) <= 300),
  contexto jsonb not null default '{}'::jsonb check (length(contexto::text) <= 4000),
  resolucion text check (resolucion is null or length(resolucion) <= 2000),
  atendido_por uuid references public.administradores(id) on delete set null,
  atendido_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((reportante_tipo = 'estudiante' and estudiante_id is not null and docente_id is null)
    or (reportante_tipo = 'docente' and docente_id is not null and estudiante_id is null))
);

create index if not exists reportes_estado_prioridad_idx on public.reportes(estado, prioridad, created_at desc);
create index if not exists reportes_reportante_id_idx on public.reportes(reportante_id, created_at desc);
create index if not exists reportes_grupo_id_idx on public.reportes(grupo_id, created_at desc);

alter table public.administradores enable row level security;
alter table public.reportes enable row level security;

revoke all on public.administradores from public, anon, authenticated;
grant select (id, nombre, activo, created_at) on public.administradores to authenticated;

revoke all on public.reportes from public, anon;
grant select, insert, update on public.reportes to authenticated;
revoke delete on public.reportes from public, anon, authenticated;

drop policy if exists "administrador ve su perfil" on public.administradores;
create policy "administrador ve su perfil" on public.administradores
  for select to authenticated
  using (id = (select auth.uid()) and activo = true);

drop policy if exists "reportante ve sus reportes" on public.reportes;
create policy "reportante ve sus reportes" on public.reportes
  for select to authenticated
  using (reportante_id = (select auth.uid()));

drop policy if exists "administrador ve todos los reportes" on public.reportes;
create policy "administrador ve todos los reportes" on public.reportes
  for select to authenticated
  using (exists (
    select 1 from public.administradores a
    where a.id = (select auth.uid()) and a.activo = true
  ));

drop policy if exists "estudiante o docente crea su reporte" on public.reportes;
create policy "estudiante o docente crea su reporte" on public.reportes
  for insert to authenticated
  with check (
    reportante_id = (select auth.uid())
    and (
      (
        reportante_tipo = 'estudiante'
        and exists (
          select 1 from public.estudiantes e
          where e.id = reportes.estudiante_id
            and e.auth_user_id = (select auth.uid())
            and e.activo = true
            and (reportes.grupo_id is null or reportes.grupo_id = e.grupo_id)
        )
      )
      or
      (
        reportante_tipo = 'docente'
        and docente_id = (select auth.uid())
        and exists (
          select 1 from public.docentes d
          where d.id = (select auth.uid())
        )
        and (
          reportes.grupo_id is null
          or exists (
            select 1 from public.grupos g
            where g.id = reportes.grupo_id and g.docente_id = (select auth.uid())
          )
        )
      )
    )
  );

drop policy if exists "administrador atiende reportes" on public.reportes;
create policy "administrador atiende reportes" on public.reportes
  for update to authenticated
  using (exists (
    select 1 from public.administradores a
    where a.id = (select auth.uid()) and a.activo = true
  ))
  with check (
    exists (
      select 1 from public.administradores a
      where a.id = (select auth.uid()) and a.activo = true
    )
    and (atendido_por is null or atendido_por = (select auth.uid()))
  );

-- El administrador observa el funcionamiento global, pero estas policies
-- no le conceden escritura sobre grupos, estudiantes o contenido.
drop policy if exists "administrador observa docentes" on public.docentes;
create policy "administrador observa docentes" on public.docentes
  for select to authenticated
  using (exists (select 1 from public.administradores a where a.id = (select auth.uid()) and a.activo = true));

drop policy if exists "administrador observa grupos" on public.grupos;
create policy "administrador observa grupos" on public.grupos
  for select to authenticated
  using (exists (select 1 from public.administradores a where a.id = (select auth.uid()) and a.activo = true));

drop policy if exists "administrador observa estudiantes" on public.estudiantes;
create policy "administrador observa estudiantes" on public.estudiantes
  for select to authenticated
  using (exists (select 1 from public.administradores a where a.id = (select auth.uid()) and a.activo = true));

drop policy if exists "administrador observa unidades" on public.unidades;
create policy "administrador observa unidades" on public.unidades
  for select to authenticated
  using (exists (select 1 from public.administradores a where a.id = (select auth.uid()) and a.activo = true));

drop policy if exists "administrador observa actividades" on public.actividades;
create policy "administrador observa actividades" on public.actividades
  for select to authenticated
  using (exists (select 1 from public.administradores a where a.id = (select auth.uid()) and a.activo = true));

drop policy if exists "administrador observa entregas" on public.entregas;
create policy "administrador observa entregas" on public.entregas
  for select to authenticated
  using (exists (select 1 from public.administradores a where a.id = (select auth.uid()) and a.activo = true));

drop policy if exists "administrador observa reflexiones" on public.reflexiones;
create policy "administrador observa reflexiones" on public.reflexiones
  for select to authenticated
  using (exists (select 1 from public.administradores a where a.id = (select auth.uid()) and a.activo = true));

drop policy if exists "administrador observa confianza" on public.autoevaluaciones_confianza;
create policy "administrador observa confianza" on public.autoevaluaciones_confianza
  for select to authenticated
  using (exists (select 1 from public.administradores a where a.id = (select auth.uid()) and a.activo = true));

drop policy if exists "administrador observa insignias otorgadas" on public.insignias_otorgadas;
create policy "administrador observa insignias otorgadas" on public.insignias_otorgadas
  for select to authenticated
  using (exists (select 1 from public.administradores a where a.id = (select auth.uid()) and a.activo = true));

drop policy if exists "administrador observa avisos" on public.avisos;
create policy "administrador observa avisos" on public.avisos
  for select to authenticated
  using (exists (select 1 from public.administradores a where a.id = (select auth.uid()) and a.activo = true));

drop policy if exists "administrador observa eventos" on public.eventos;
create policy "administrador observa eventos" on public.eventos
  for select to authenticated
  using (exists (select 1 from public.administradores a where a.id = (select auth.uid()) and a.activo = true));

drop policy if exists "administrador observa bitacora" on public.bitacora;
create policy "administrador observa bitacora" on public.bitacora
  for select to authenticated
  using (exists (select 1 from public.administradores a where a.id = (select auth.uid()) and a.activo = true));
