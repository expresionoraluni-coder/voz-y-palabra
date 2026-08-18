-- El panel administrativo exige AAL2 cuando la cuenta ya tiene un factor
-- verificado. Mientras no exista uno, la cuenta puede entrar únicamente para
-- configurarlo desde /admin/seguridad.
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
       and (
         not exists (
           select 1
             from auth.mfa_factors factor
            where factor.user_id = (select auth.uid())
              and factor.status = 'verified'
         )
         or coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'
       )
  );
$$;

revoke all on function public.es_administrador_activo() from public, anon;
grant execute on function public.es_administrador_activo() to authenticated;
