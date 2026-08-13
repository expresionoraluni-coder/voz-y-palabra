-- Hardening de acceso para Voz y Palabra.
-- Esta migración queda versionada para la siguiente ventana de mantenimiento.
-- No se ejecuta automáticamente desde la aplicación.

-- Las unidades y actividades contienen instrucciones y, en algunos casos,
-- claves de respuesta. La lectura del estudiante ocurre en Server Components
-- después de validar la sesión; nunca se abre el Data API a cualquier sesión.
drop policy if exists "cualquiera con sesión lee unidades" on public.unidades;
drop policy if exists "cualquiera con sesión lee actividades" on public.actividades;

drop policy if exists "docente administra unidades" on public.unidades;
create policy "docente administra unidades"
  on public.unidades
  for all to authenticated
  using (exists (select 1 from public.docentes where id = (select auth.uid())))
  with check (exists (select 1 from public.docentes where id = (select auth.uid())));

drop policy if exists "docente administra actividades" on public.actividades;
create policy "docente administra actividades"
  on public.actividades
  for all to authenticated
  using (exists (select 1 from public.docentes where id = (select auth.uid())))
  with check (exists (select 1 from public.docentes where id = (select auth.uid())));

-- El estudiante no escribe entregas por el Data API. El único camino de
-- escritura es la Server Action, que vuelve a validar sesión, actividad y
-- estructura de la respuesta antes de usar service_role en el servidor.
drop policy if exists "estudiante administra sus entregas" on public.entregas;
drop policy if exists "estudiante lee sus entregas" on public.entregas;
create policy "estudiante lee sus entregas"
  on public.entregas
  for select to authenticated
  using (estudiante_id = public.estudiante_actual());

-- Estas funciones son triggers internos y no deben ser endpoints de RPC.
revoke execute on function public.proteger_columnas_entrega() from public, anon, authenticated;
revoke execute on function public.proteger_correo_docente() from public, anon, authenticated;

-- Solo una docente autenticada puede usar estas operaciones administrativas.
revoke execute on function public.agregar_estudiantes_con_boleta(uuid, jsonb) from anon;
revoke execute on function public.reiniciar_nip_estudiante(uuid) from anon;

-- El estudiante usa este índice para resolver rápidamente el requisito de
-- otra actividad y para no forzar búsquedas secuenciales al crecer el curso.
create index if not exists actividades_requiere_actividad_id_idx
  on public.actividades(requiere_actividad_id);

-- Evita reevaluar auth.uid() una vez por fila en las operaciones de docente.
alter policy "docente administra sus avisos" on public.avisos
  using (docente_id = (select auth.uid()))
  with check (docente_id = (select auth.uid()));
alter policy "docente administra sus eventos" on public.eventos
  using (docente_id = (select auth.uid()))
  with check (docente_id = (select auth.uid()));
alter policy "docente administra su retroalimentación" on public.retroalimentacion_docente
  using (docente_id = (select auth.uid()))
  with check (docente_id = (select auth.uid()));

alter policy "docente ve entregas de sus grupos" on public.entregas
  using (estudiante_id in (
    select e.id
    from public.estudiantes e
    join public.grupos g on g.id = e.grupo_id
    where g.docente_id = (select auth.uid())
  ));

alter policy "docente ve reflexiones de sus grupos" on public.reflexiones
  using (estudiante_id in (
    select e.id
    from public.estudiantes e
    join public.grupos g on g.id = e.grupo_id
    where g.docente_id = (select auth.uid())
  ));

alter policy "docente ve confianza de sus grupos" on public.autoevaluaciones_confianza
  using (estudiante_id in (
    select e.id
    from public.estudiantes e
    join public.grupos g on g.id = e.grupo_id
    where g.docente_id = (select auth.uid())
  ));

alter policy "docente ve insignias de sus grupos" on public.insignias_otorgadas
  using (estudiante_id in (
    select e.id
    from public.estudiantes e
    join public.grupos g on g.id = e.grupo_id
    where g.docente_id = (select auth.uid())
  ));
