-- La cuenta administrativa no puede usar una sesión AAL1 para consultar o
-- modificar datos administrativos. La configuración del MFA ocurre por el
-- servidor y no necesita pasar por estas policies.

create or replace function public.es_administrador_activo()
returns boolean
language sql
stable
security definer
set search_path = public, auth, extensions
as $$
  select exists (
    select 1
      from public.administradores a
      join auth.users u on u.id = a.id
     where a.id = (select auth.uid())
       and a.activo = true
       and u.email_confirmed_at is not null
       and lower(u.email) = lower('digp.inv.ipn@gmail.com')
       and exists (
         select 1
           from auth.mfa_factors factor
          where factor.user_id = (select auth.uid())
            and factor.factor_type = 'totp'
            and factor.status = 'verified'
       )
       and coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
  );
$$;

revoke all on function public.es_administrador_activo() from public, anon;
grant execute on function public.es_administrador_activo() to authenticated;

create or replace function public.crear_perfil_docente(p_nombre text, p_codigo_invitacion text)
returns text language plpgsql security definer set search_path = public, extensions
as $$
declare v_hash text; v_correo text; v_intentos record; v_max_intentos constant int := 5; v_minutos_bloqueo constant int := 15;
  v_email_confirmado timestamptz;
begin
  if auth.uid() is null then raise exception 'Sesión inválida, intenta de nuevo'; end if;
  if coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true' then
    raise exception 'Se requiere una cuenta docente confirmada.';
  end if;
  select email, email_confirmed_at into v_correo, v_email_confirmado from auth.users where id = auth.uid();
  if lower(trim(coalesce(v_correo, ''))) = lower('digp.inv.ipn@gmail.com') then
    raise exception 'Esta cuenta tiene acceso administrativo y no se puede registrar como docente.';
  end if;
  if v_email_confirmado is null then raise exception 'Confirma tu correo antes de continuar.'; end if;
  select * into v_intentos from public.intentos_codigo_invitacion where usuario_id = auth.uid();
  if v_intentos.bloqueado_hasta is not null and v_intentos.bloqueado_hasta > now() then return format('Demasiados intentos. Espera %s minutos e intenta de nuevo.', greatest(1, ceil(extract(epoch from (v_intentos.bloqueado_hasta - now())) / 60))); end if;
  select valor into v_hash from public.configuracion_plataforma where clave = 'codigo_invitacion_docente_hash';
  if v_hash is null or extensions.crypt(coalesce(trim(p_codigo_invitacion), ''), v_hash) <> v_hash then
    insert into public.intentos_codigo_invitacion (usuario_id, intentos, bloqueado_hasta) values (auth.uid(), 1, null)
      on conflict (usuario_id) do update set intentos = public.intentos_codigo_invitacion.intentos + 1, bloqueado_hasta = case when public.intentos_codigo_invitacion.intentos + 1 >= v_max_intentos then now() + (v_minutos_bloqueo || ' minutes')::interval else public.intentos_codigo_invitacion.bloqueado_hasta end;
    perform pg_sleep(0.5); return 'El código de invitación no es correcto.';
  end if;
  delete from public.intentos_codigo_invitacion where usuario_id = auth.uid();
  if p_nombre is null or length(trim(p_nombre)) = 0 or length(p_nombre) > 200 then raise exception 'Escribe tu nombre.'; end if;
  insert into public.docentes (id, nombre, correo) values (auth.uid(), trim(p_nombre), v_correo) on conflict (id) do nothing;
  return null;
end;
$$;

revoke execute on function public.crear_perfil_docente(text, text) from public, anon;
grant execute on function public.crear_perfil_docente(text, text) to authenticated;
