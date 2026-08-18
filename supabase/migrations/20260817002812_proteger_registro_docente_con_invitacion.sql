-- Impide crear cuentas docentes sin código de invitación.
-- La validación ocurre dentro de la transacción de auth.users y no expone
-- un RPC público que permita adivinar el código.

create or replace function public.validar_invitacion_alta_docente()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_codigo text;
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

  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb)
    - 'codigo_invitacion_docente';
  return new;
end;
$$;

drop trigger if exists validar_invitacion_alta_docente on auth.users;
create trigger validar_invitacion_alta_docente
  before insert on auth.users
  for each row execute function public.validar_invitacion_alta_docente();

revoke all on function public.validar_invitacion_alta_docente() from public, anon, authenticated;
