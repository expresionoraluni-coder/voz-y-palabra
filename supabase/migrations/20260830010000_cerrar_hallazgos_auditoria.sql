begin;

-- Las sesiones anónimas de estudiantes usan el rol SQL `authenticated`.
-- Este guard distingue una cuenta docente permanente de ese tipo de sesión.
create or replace function public.es_docente_activo()
returns boolean
language sql stable security definer
set search_path = public, auth
as $$
  select (select auth.uid()) is not null
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
    and exists (
      select 1
      from public.docentes d
      join auth.users u on u.id = d.id
      where d.id = (select auth.uid())
        and u.email_confirmed_at is not null
    )
$$;

revoke all on function public.es_docente_activo() from public, anon;
grant execute on function public.es_docente_activo() to authenticated;

-- Todas las escrituras de contenido y operación docente pasan por el mismo
-- guard. Se conservan las lecturas de estudiante y de administración.
drop policy if exists "docente edita su propio perfil" on public.docentes;
create policy "docente edita su propio perfil" on public.docentes
  for update to authenticated
  using (public.es_docente_activo() and id = (select auth.uid()))
  with check (public.es_docente_activo() and id = (select auth.uid()));

drop policy if exists "docente crea grupos" on public.grupos;
create policy "docente crea grupos" on public.grupos for insert to authenticated
  with check (public.es_docente_activo() and docente_id = (select auth.uid()));
drop policy if exists "docente actualiza grupos" on public.grupos;
create policy "docente actualiza grupos" on public.grupos for update to authenticated
  using (public.es_docente_activo() and docente_id = (select auth.uid()))
  with check (public.es_docente_activo() and docente_id = (select auth.uid()));
drop policy if exists "docente elimina grupos" on public.grupos;
create policy "docente elimina grupos" on public.grupos for delete to authenticated
  using (public.es_docente_activo() and docente_id = (select auth.uid()));

drop policy if exists "docente crea estudiantes de sus grupos" on public.estudiantes;
create policy "docente crea estudiantes de sus grupos" on public.estudiantes for insert to authenticated
  with check (public.es_docente_activo() and grupo_id in (
    select g.id from public.grupos g where g.docente_id = (select auth.uid())
  ));
drop policy if exists "docente actualiza estudiantes de sus grupos" on public.estudiantes;
create policy "docente actualiza estudiantes de sus grupos" on public.estudiantes for update to authenticated
  using (public.es_docente_activo() and grupo_id in (
    select g.id from public.grupos g where g.docente_id = (select auth.uid())
  ))
  with check (public.es_docente_activo() and grupo_id in (
    select g.id from public.grupos g where g.docente_id = (select auth.uid())
  ));
drop policy if exists "docente elimina estudiantes de sus grupos" on public.estudiantes;
create policy "docente elimina estudiantes de sus grupos" on public.estudiantes for delete to authenticated
  using (public.es_docente_activo() and grupo_id in (
    select g.id from public.grupos g where g.docente_id = (select auth.uid())
  ));

drop policy if exists "docente o administrador lee unidades" on public.unidades;
create policy "docente o administrador lee unidades" on public.unidades for select to authenticated
  using (public.es_docente_activo() or public.es_administrador_activo());
drop policy if exists "docente crea unidades" on public.unidades;
create policy "docente crea unidades" on public.unidades for insert to authenticated
  with check (public.es_docente_activo());
drop policy if exists "docente actualiza unidades" on public.unidades;
create policy "docente actualiza unidades" on public.unidades for update to authenticated
  using (public.es_docente_activo()) with check (public.es_docente_activo());
drop policy if exists "docente elimina unidades" on public.unidades;
create policy "docente elimina unidades" on public.unidades for delete to authenticated
  using (public.es_docente_activo());

drop policy if exists "docente o administrador lee actividades" on public.actividades;
create policy "docente o administrador lee actividades" on public.actividades for select to authenticated
  using (public.es_docente_activo() or public.es_administrador_activo());
drop policy if exists "docente crea actividades" on public.actividades;
create policy "docente crea actividades" on public.actividades for insert to authenticated
  with check (public.es_docente_activo());
drop policy if exists "docente actualiza actividades" on public.actividades;
create policy "docente actualiza actividades" on public.actividades for update to authenticated
  using (public.es_docente_activo()) with check (public.es_docente_activo());
drop policy if exists "docente elimina actividades" on public.actividades;
create policy "docente elimina actividades" on public.actividades for delete to authenticated
  using (public.es_docente_activo());

drop policy if exists "docente crea retroalimentación" on public.retroalimentacion_docente;
create policy "docente crea retroalimentación" on public.retroalimentacion_docente for insert to authenticated
  with check (
    public.es_docente_activo()
    and docente_id = (select auth.uid())
    and entrega_id in (
      select en.id
      from public.entregas en
      join public.estudiantes e on e.id = en.estudiante_id
      join public.grupos g on g.id = e.grupo_id
      where g.docente_id = (select auth.uid())
    )
  );
drop policy if exists "docente actualiza retroalimentación" on public.retroalimentacion_docente;
create policy "docente actualiza retroalimentación" on public.retroalimentacion_docente for update to authenticated
  using (
    public.es_docente_activo()
    and docente_id = (select auth.uid())
    and entrega_id in (
      select en.id
      from public.entregas en
      join public.estudiantes e on e.id = en.estudiante_id
      join public.grupos g on g.id = e.grupo_id
      where g.docente_id = (select auth.uid())
    )
  )
  with check (
    public.es_docente_activo()
    and docente_id = (select auth.uid())
    and entrega_id in (
      select en.id
      from public.entregas en
      join public.estudiantes e on e.id = en.estudiante_id
      join public.grupos g on g.id = e.grupo_id
      where g.docente_id = (select auth.uid())
    )
  );
drop policy if exists "docente elimina retroalimentación" on public.retroalimentacion_docente;
create policy "docente elimina retroalimentación" on public.retroalimentacion_docente for delete to authenticated
  using (
    public.es_docente_activo()
    and docente_id = (select auth.uid())
    and entrega_id in (
      select en.id
      from public.entregas en
      join public.estudiantes e on e.id = en.estudiante_id
      join public.grupos g on g.id = e.grupo_id
      where g.docente_id = (select auth.uid())
    )
  );

drop policy if exists "docente crea avisos" on public.avisos;
create policy "docente crea avisos" on public.avisos for insert to authenticated
  with check (
    public.es_docente_activo()
    and docente_id = (select auth.uid())
    and (grupo_id is null or exists (
      select 1 from public.grupos g
      where g.id = public.avisos.grupo_id and g.docente_id = (select auth.uid())
    ))
  );
drop policy if exists "docente actualiza avisos" on public.avisos;
create policy "docente actualiza avisos" on public.avisos for update to authenticated
  using (
    public.es_docente_activo()
    and docente_id = (select auth.uid())
    and (grupo_id is null or exists (
      select 1 from public.grupos g
      where g.id = public.avisos.grupo_id and g.docente_id = (select auth.uid())
    ))
  )
  with check (
    public.es_docente_activo()
    and docente_id = (select auth.uid())
    and (grupo_id is null or exists (
      select 1 from public.grupos g
      where g.id = public.avisos.grupo_id and g.docente_id = (select auth.uid())
    ))
  );
drop policy if exists "docente elimina avisos" on public.avisos;
create policy "docente elimina avisos" on public.avisos for delete to authenticated
  using (
    public.es_docente_activo()
    and docente_id = (select auth.uid())
    and (grupo_id is null or exists (
      select 1 from public.grupos g
      where g.id = public.avisos.grupo_id and g.docente_id = (select auth.uid())
    ))
  );

drop policy if exists "docente crea eventos" on public.eventos;
create policy "docente crea eventos" on public.eventos for insert to authenticated
  with check (
    public.es_docente_activo()
    and docente_id = (select auth.uid())
    and exists (
      select 1 from public.grupos g
      where g.id = public.eventos.grupo_id and g.docente_id = (select auth.uid())
    )
  );
drop policy if exists "docente actualiza eventos" on public.eventos;
create policy "docente actualiza eventos" on public.eventos for update to authenticated
  using (
    public.es_docente_activo()
    and docente_id = (select auth.uid())
    and exists (
      select 1 from public.grupos g
      where g.id = public.eventos.grupo_id and g.docente_id = (select auth.uid())
    )
  )
  with check (
    public.es_docente_activo()
    and docente_id = (select auth.uid())
    and exists (
      select 1 from public.grupos g
      where g.id = public.eventos.grupo_id and g.docente_id = (select auth.uid())
    )
  );
drop policy if exists "docente elimina eventos" on public.eventos;
create policy "docente elimina eventos" on public.eventos for delete to authenticated
  using (
    public.es_docente_activo()
    and docente_id = (select auth.uid())
    and exists (
      select 1 from public.grupos g
      where g.id = public.eventos.grupo_id and g.docente_id = (select auth.uid())
    )
  );

-- Los RPC que escriben el roster también deben defenderse aunque una policy
-- futura conceda por error acceso a authenticated.
create or replace function public.agregar_estudiantes_con_boleta(p_grupo_id uuid, p_estudiantes jsonb)
returns integer language plpgsql security definer set search_path = public, extensions
as $$
declare v_item jsonb; v_nombre text; v_boleta text; v_creados integer := 0;
begin
  if not public.es_docente_activo() then raise exception 'Se requiere una cuenta docente confirmada.'; end if;
  if not exists (select 1 from public.grupos where id = p_grupo_id and docente_id = auth.uid()) then raise exception 'No tienes permiso sobre este grupo.'; end if;
  if jsonb_typeof(p_estudiantes) <> 'array' or jsonb_array_length(p_estudiantes) > 100 then raise exception 'La lista de estudiantes no es válida.'; end if;
  for v_item in select * from jsonb_array_elements(p_estudiantes) loop
    v_nombre := public.normalizar_nombre(coalesce(v_item->>'nombre', ''));
    v_boleta := regexp_replace(coalesce(v_item->>'boleta', ''), '\D', '', 'g');
    if v_nombre = '' then raise exception 'Falta el nombre de un estudiante.'; end if;
    if length(v_boleta) < 4 or length(v_boleta) > 20 then raise exception 'La boleta de "%" no es válida.', v_nombre; end if;
    insert into public.estudiantes (nombre, grupo_id, boleta, nip_hash, debe_cambiar_nip)
    values (v_nombre, p_grupo_id, v_boleta, extensions.crypt(right(v_boleta, 4), extensions.gen_salt('bf')), true);
    v_creados := v_creados + 1;
  end loop;
  return v_creados;
end;
$$;

create or replace function public.reiniciar_nip_estudiante(p_estudiante_id uuid)
returns text language plpgsql security definer set search_path = public, extensions
as $$
declare v_nip_temporal text; v_bytes bytea;
begin
  if not public.es_docente_activo() then raise exception 'Se requiere una cuenta docente confirmada.'; end if;
  if not exists (
    select 1 from public.estudiantes e
    join public.grupos g on g.id = e.grupo_id
    where e.id = p_estudiante_id and g.docente_id = auth.uid()
  ) then raise exception 'No tienes permiso sobre este estudiante.'; end if;
  v_bytes := extensions.gen_random_bytes(2);
  v_nip_temporal := (1000 + (get_byte(v_bytes, 0) * 256 + get_byte(v_bytes, 1)) % 9000)::text;
  update public.estudiantes
     set nip_hash = extensions.crypt(v_nip_temporal, extensions.gen_salt('bf')),
         auth_user_id = null, intentos_fallidos = 0, bloqueado_hasta = null,
         debe_cambiar_nip = true
   where id = p_estudiante_id;
  return v_nip_temporal;
end;
$$;
revoke execute on function public.agregar_estudiantes_con_boleta(uuid, jsonb) from public, anon;
grant execute on function public.agregar_estudiantes_con_boleta(uuid, jsonb) to authenticated;
revoke execute on function public.reiniciar_nip_estudiante(uuid) from public, anon;
grant execute on function public.reiniciar_nip_estudiante(uuid) to authenticated;

-- El esquema privado solo lo usa el pre-request ejecutado por authenticator
-- y las funciones internas. No debe ser navegable desde el Data API.
revoke usage on schema private from anon, authenticated;
revoke execute on function private.controlar_rate_limit_ingreso() from anon, authenticated;
grant usage on schema private to authenticator, service_role;
grant execute on function private.controlar_rate_limit_ingreso() to authenticator, service_role;

-- FAQ: el navegador solo consulta y registra mediante el RPC controlado.
drop policy if exists "todos leen faq activa" on public.faq_articulos;
create policy "todos leen faq activa" on public.faq_articulos for select to authenticated using (
  (select public.es_administrador_activo())
  or (
    activo and (
      (coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') = 'true' and audiencia in ('estudiante', 'ambos'))
      or ((select public.es_docente_activo()) and audiencia in ('docente', 'ambos'))
    )
  )
);
revoke insert on public.faq_interacciones from public, anon, authenticated;
drop policy if exists "usuario registra interacciones faq" on public.faq_interacciones;
create index if not exists faq_interacciones_actor_creado_idx
  on public.faq_interacciones (actor_id, creado_en desc);
drop index if exists public.faq_interacciones_actor_idx;

create or replace function public.registrar_interaccion_faq(
  p_articulo_id uuid,
  p_evento text,
  p_reporte_id uuid default null,
  p_contexto jsonb default '{}'::jsonb
)
returns void
language plpgsql security definer
set search_path = public, auth, pg_catalog
as $$
declare
  v_actor uuid := (select auth.uid());
  v_admin boolean;
  v_docente boolean;
  v_interacciones integer;
begin
  if v_actor is null then raise exception 'Sesión inválida.'; end if;
  v_admin := public.es_administrador_activo();
  v_docente := public.es_docente_activo();
  if p_evento not in ('mostrado', 'abierto', 'util', 'no_util', 'reporte_creado') then raise exception 'La interacción de ayuda no es válida.'; end if;
  if jsonb_typeof(coalesce(p_contexto, '{}'::jsonb)) <> 'object' or length(coalesce(p_contexto, '{}'::jsonb)::text) > 4000 then raise exception 'El contexto de ayuda no es válido.'; end if;
  if not exists (
    select 1 from public.faq_articulos
    where id = p_articulo_id and activo
      and (
        v_admin
        or (coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') = 'true' and audiencia in ('estudiante', 'ambos'))
        or (v_docente and audiencia in ('docente', 'ambos'))
      )
  ) then raise exception 'El artículo de ayuda no está disponible.'; end if;
  if p_reporte_id is not null and not exists (
    select 1 from public.reportes r
    where r.id = p_reporte_id and (r.reportante_id = v_actor or v_admin)
  ) then raise exception 'No tienes permiso para asociar este reporte.'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_actor::text, 0));
  select count(*) into v_interacciones
    from public.faq_interacciones
   where actor_id = v_actor and creado_en >= now() - interval '1 hour';
  if v_interacciones >= 300 then
    raise exception 'Alcanzaste el límite temporal de interacciones de ayuda.';
  end if;
  if p_evento = 'mostrado' and exists (
    select 1 from public.faq_interacciones
    where actor_id = v_actor and articulo_id = p_articulo_id
      and evento = p_evento and creado_en >= now() - interval '10 seconds'
  ) then return; end if;
  insert into public.faq_interacciones (articulo_id, actor_id, evento, reporte_id, contexto)
  values (p_articulo_id, v_actor, p_evento, p_reporte_id, coalesce(p_contexto, '{}'::jsonb));
end;
$$;
revoke execute on function public.registrar_interaccion_faq(uuid, text, uuid, jsonb) from public, anon;
grant execute on function public.registrar_interaccion_faq(uuid, text, uuid, jsonb) to authenticated;

commit;
