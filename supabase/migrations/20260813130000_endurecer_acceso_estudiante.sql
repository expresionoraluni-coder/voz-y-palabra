-- Hardening de acceso para Voz y Palabra.
-- Esta migración queda versionada para la siguiente ventana de mantenimiento.
-- No se ejecuta automáticamente desde la aplicación.

-- Las unidades y actividades contienen instrucciones y, en algunos casos,
-- claves de respuesta. La lectura del estudiante ocurre en Server Components
-- después de validar la sesión; nunca se abre el Data API a cualquier sesión.
create or replace function public.estudiante_actual()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from public.estudiantes where auth_user_id = auth.uid() and activo = true
$$;

drop policy if exists "cualquiera con sesión lee unidades" on public.unidades;
drop policy if exists "cualquiera con sesión lee actividades" on public.actividades;

drop policy if exists "estudiante edita su propia fila" on public.estudiantes;
drop policy if exists "estudiante lee su propia fila" on public.estudiantes;
create policy "estudiante lee su propia fila"
  on public.estudiantes
  for select to authenticated
  using (auth_user_id = (select auth.uid()) and activo = true);

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

drop policy if exists "docente actualiza apoyo en entregas" on public.entregas;
create policy "docente actualiza apoyo en entregas"
  on public.entregas
  for update to authenticated
  using (estudiante_id in (
    select e.id
    from public.estudiantes e
    join public.grupos g on g.id = e.grupo_id
    where g.docente_id = (select auth.uid())
  ))
  with check (estudiante_id in (
    select e.id
    from public.estudiantes e
    join public.grupos g on g.id = e.grupo_id
    where g.docente_id = (select auth.uid())
  ));

-- Estas funciones son triggers internos y no deben ser endpoints de RPC.
revoke execute on function public.proteger_columnas_entrega() from public, anon, authenticated;
revoke execute on function public.proteger_correo_docente() from public, anon, authenticated;
revoke execute on function public.estudiante_tiene_nip(text, text) from public, anon, authenticated;

-- Solo una docente autenticada puede usar estas operaciones administrativas.
revoke execute on function public.agregar_estudiantes_con_boleta(uuid, jsonb) from anon;
revoke execute on function public.reiniciar_nip_estudiante(uuid) from anon;

-- El RPC solo necesita devolver cuántos estudiantes se crearon. No se envían
-- al navegador docente hashes de NIP ni columnas internas de autenticación.
drop function if exists public.agregar_estudiantes_con_boleta(uuid, jsonb);
create function public.agregar_estudiantes_con_boleta(p_grupo_id uuid, p_estudiantes jsonb)
returns integer language plpgsql security definer set search_path = public, extensions
as $$
declare v_item jsonb; v_nombre text; v_boleta text; v_creados integer := 0;
begin
  if not exists (select 1 from public.grupos where id = p_grupo_id and docente_id = auth.uid()) then raise exception 'No tienes permiso sobre este grupo.'; end if;
  if jsonb_typeof(p_estudiantes) <> 'array' or jsonb_array_length(p_estudiantes) > 100 then raise exception 'La lista de estudiantes no es válida.'; end if;
  for v_item in select * from jsonb_array_elements(p_estudiantes) loop
    v_nombre := public.normalizar_nombre(coalesce(v_item->>'nombre', '')); v_boleta := regexp_replace(coalesce(v_item->>'boleta', ''), '\D', '', 'g');
    if v_nombre = '' then raise exception 'Falta el nombre de un estudiante.'; end if;
    if length(v_boleta) < 4 or length(v_boleta) > 20 then raise exception 'La boleta de "%" no es válida.', v_nombre; end if;
    insert into public.estudiantes (nombre, grupo_id, boleta, nip_hash, debe_cambiar_nip)
      values (v_nombre, p_grupo_id, v_boleta, extensions.crypt(right(v_boleta, 4), extensions.gen_salt('bf')), true);
    v_creados := v_creados + 1;
  end loop;
  return v_creados;
end;
$$;
revoke execute on function public.agregar_estudiantes_con_boleta(uuid, jsonb) from anon;

-- El estudiante usa este índice para resolver rápidamente el requisito de
-- otra actividad y para no forzar búsquedas secuenciales al crecer el curso.
create index if not exists actividades_requiere_actividad_id_idx
  on public.actividades(requiere_actividad_id);

-- Evita reevaluar auth.uid() una vez por fila en las operaciones de docente.
alter policy "docente administra sus avisos" on public.avisos
  using (
    docente_id = (select auth.uid())
    and (
      grupo_id is null
      or exists (
        select 1 from public.grupos
        where grupos.id = avisos.grupo_id
          and grupos.docente_id = (select auth.uid())
      )
    )
  )
  with check (
    docente_id = (select auth.uid())
    and (
      grupo_id is null
      or exists (
        select 1 from public.grupos
        where grupos.id = avisos.grupo_id
          and grupos.docente_id = (select auth.uid())
      )
    )
  );
alter policy "docente administra sus eventos" on public.eventos
  using (
    docente_id = (select auth.uid())
    and exists (
      select 1 from public.grupos
      where grupos.id = eventos.grupo_id
        and grupos.docente_id = (select auth.uid())
    )
  )
  with check (
    docente_id = (select auth.uid())
    and exists (
      select 1 from public.grupos
      where grupos.id = eventos.grupo_id
        and grupos.docente_id = (select auth.uid())
    )
  );
drop policy if exists "docente administra su retroalimentación" on public.retroalimentacion_docente;
create policy "docente administra su retroalimentación"
  on public.retroalimentacion_docente
  for all to authenticated
  using (
    docente_id = (select auth.uid())
    and entrega_id in (
      select en.id
      from public.entregas en
      join public.estudiantes e on e.id = en.estudiante_id
      join public.grupos g on g.id = e.grupo_id
      where g.docente_id = (select auth.uid())
    )
  )
  with check (
    docente_id = (select auth.uid())
    and entrega_id in (
      select en.id
      from public.entregas en
      join public.estudiantes e on e.id = en.estudiante_id
      join public.grupos g on g.id = e.grupo_id
      where g.docente_id = (select auth.uid())
    )
  );

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
