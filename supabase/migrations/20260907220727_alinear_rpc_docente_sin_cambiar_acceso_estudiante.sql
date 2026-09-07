begin;

-- Estas piezas se publican por separado porque la aplicación ya usa el flujo
-- de invitación validada al crear la cuenta. No modifican las credenciales ni
-- el acceso de estudiantes.
create table if not exists private.altas_docente_autorizadas (
  usuario_id uuid primary key,
  autorizado_en timestamptz not null default now(),
  expira_en timestamptz not null default (now() + interval '24 hours'),
  usado_en timestamptz
);
revoke all on table private.altas_docente_autorizadas from public, anon, authenticated;
grant all on table private.altas_docente_autorizadas to service_role;

create or replace function public.validar_invitacion_alta_docente()
returns trigger language plpgsql security definer
set search_path = public, extensions, private, pg_catalog
as $$
declare v_hash text; v_codigo text;
begin
  if coalesce(new.is_anonymous, false) then return new; end if;
  v_codigo := new.raw_user_meta_data ->> 'codigo_invitacion_docente';
  select valor into v_hash
    from public.configuracion_plataforma
   where clave = 'codigo_invitacion_docente_hash';
  if length(trim(coalesce(v_codigo, ''))) < 4
     or length(trim(coalesce(v_codigo, ''))) > 64
     or v_hash is null
     or extensions.crypt(trim(coalesce(v_codigo, '')), v_hash) <> v_hash then
    raise exception 'El código de invitación no es correcto.';
  end if;
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'codigo_invitacion_docente';
  insert into private.altas_docente_autorizadas (usuario_id, autorizado_en, expira_en, usado_en)
  values (new.id, now(), now() + interval '24 hours', null)
  on conflict (usuario_id) do update
    set autorizado_en = excluded.autorizado_en,
        expira_en = excluded.expira_en,
        usado_en = null;
  return new;
end;
$$;

drop trigger if exists validar_invitacion_alta_docente on auth.users;
create trigger validar_invitacion_alta_docente
before insert on auth.users
for each row execute function public.validar_invitacion_alta_docente();
revoke all on function public.validar_invitacion_alta_docente() from public, anon, authenticated;

insert into private.altas_docente_autorizadas (usuario_id, autorizado_en, expira_en, usado_en)
select u.id, now(), now() + interval '7 days', null
from auth.users u
where coalesce(u.is_anonymous, false) = false
  and u.email_confirmed_at is not null
  and not exists (select 1 from public.docentes d where d.id = u.id)
  and not exists (select 1 from public.administradores a where a.id = u.id)
on conflict (usuario_id) do nothing;

create or replace function public.completar_perfil_docente(p_nombre text)
returns text language plpgsql security definer
set search_path = public, private, auth, pg_catalog
as $$
declare v_correo text; v_email_confirmado timestamptz; v_autorizacion record;
begin
  if auth.uid() is null then raise exception 'Sesión inválida, intenta de nuevo'; end if;
  if coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true' then
    raise exception 'Se requiere una cuenta docente confirmada.';
  end if;
  select email, email_confirmed_at into v_correo, v_email_confirmado
    from auth.users where id = auth.uid();
  if exists (select 1 from public.administradores where id = auth.uid()) then
    raise exception 'Esta cuenta tiene acceso administrativo y no se puede registrar como docente.';
  end if;
  if v_email_confirmado is null then raise exception 'Confirma tu correo antes de continuar.'; end if;
  if p_nombre is null or length(trim(p_nombre)) = 0 or length(p_nombre) > 200 then
    raise exception 'Escribe tu nombre.';
  end if;
  select * into v_autorizacion
    from private.altas_docente_autorizadas
   where usuario_id = auth.uid()
   for update;
  if v_autorizacion.usuario_id is null
     or v_autorizacion.usado_en is not null
     or v_autorizacion.expira_en <= now() then
    raise exception 'La invitación de esta cuenta ya no es válida. Crea una cuenta nueva con una invitación vigente.';
  end if;
  insert into public.docentes (id, nombre, correo)
  values (auth.uid(), trim(p_nombre), v_correo)
  on conflict (id) do nothing;
  update private.altas_docente_autorizadas set usado_en = now() where usuario_id = auth.uid();
  return null;
end;
$$;

revoke execute on function public.completar_perfil_docente(text) from public, anon;
grant execute on function public.completar_perfil_docente(text) to authenticated;

create or replace function public.crear_actividad_docente(
  p_unidad_id uuid,
  p_tipo_id uuid,
  p_titulo text,
  p_instrucciones text,
  p_aprendizaje_esperado text,
  p_video_url text,
  p_contenido jsonb
)
returns uuid language plpgsql security definer
set search_path = public, pg_catalog
as $$
declare v_id uuid; v_orden int; v_titulo text := btrim(coalesce(p_titulo, ''));
begin
  if not public.es_docente_activo() then raise exception 'Se requiere una cuenta docente confirmada.'; end if;
  if not exists (select 1 from public.unidades where id = p_unidad_id) then raise exception 'La unidad no es válida.'; end if;
  if not exists (select 1 from public.tipos_actividad where id = p_tipo_id) then raise exception 'El tipo de actividad no es válido.'; end if;
  if length(v_titulo) not between 1 and 160 then raise exception 'El título debe tener entre 1 y 160 caracteres.'; end if;
  if length(btrim(coalesce(p_instrucciones, ''))) not between 1 and 3000 then raise exception 'Las instrucciones deben tener entre 1 y 3000 caracteres.'; end if;
  if length(coalesce(p_aprendizaje_esperado, '')) > 800 then raise exception 'El aprendizaje esperado no puede superar 800 caracteres.'; end if;
  if length(coalesce(p_contenido, '{}'::jsonb)::text) > 50000 then raise exception 'El contenido de la actividad es demasiado extenso.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_unidad_id::text, 0));
  if exists (select 1 from public.actividades where unidad_id = p_unidad_id and lower(btrim(titulo)) = lower(v_titulo)) then
    raise exception 'Ya existe una actividad con ese título en la unidad.';
  end if;
  select coalesce(max(orden), 0) + 1 into v_orden from public.actividades where unidad_id = p_unidad_id;
  insert into public.actividades (unidad_id, tipo_id, titulo, instrucciones, aprendizaje_esperado, video_url, contenido, orden)
  values (p_unidad_id, p_tipo_id, v_titulo, btrim(p_instrucciones), nullif(btrim(coalesce(p_aprendizaje_esperado, '')), ''), nullif(btrim(coalesce(p_video_url, '')), ''), coalesce(p_contenido, '{}'::jsonb), v_orden)
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.crear_actividad_docente(uuid, uuid, text, text, text, text, jsonb) from public, anon;
grant execute on function public.crear_actividad_docente(uuid, uuid, text, text, text, text, jsonb) to authenticated;

commit;


