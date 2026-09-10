begin;

-- Repara instalaciones que ya tienen el RPC nuevo pero no conservaron la
-- autorización privada de cuentas docentes confirmadas durante la migración.
-- La operación es idempotente y no autoriza cuentas administrativas ni cuentas
-- que ya tienen perfil docente.
create table if not exists private.altas_docente_autorizadas (
  usuario_id uuid primary key,
  autorizado_en timestamptz not null default now(),
  expira_en timestamptz not null default (now() + interval '24 hours'),
  usado_en timestamptz
);

revoke all on table private.altas_docente_autorizadas from public, anon, authenticated;
grant all on table private.altas_docente_autorizadas to service_role;

-- Las cuentas nuevas vuelven a recibir su autorización en el mismo momento en
-- que se valida la invitación. El código no se conserva en auth.users.
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

-- No se hace backfill automático de auth.users: las cuentas existentes no
-- reciben autorización docente por defecto. La autorización solo se crea
-- durante un alta nueva que presentó una invitación válida.

commit;
