begin;

alter table public.estudiantes
  add column if not exists bienvenida_estudiante_completada_at timestamptz;

comment on column public.estudiantes.bienvenida_estudiante_completada_at is
  'Momento en que el estudiante terminó la bienvenida de primer ingreso; NULL significa pendiente.';

-- Quienes ya tienen una sesión vinculada ya pasaron por el ingreso; no se les
-- interrumpe con una pantalla nueva. Los estudiantes sin sesión conservan la
-- bienvenida pendiente, incluidos los que fueron dados de alta antes de esta
-- migración pero todavía no han entrado.
update public.estudiantes
   set bienvenida_estudiante_completada_at = coalesce(bienvenida_estudiante_completada_at, now())
 where auth_user_id is not null
   and bienvenida_estudiante_completada_at is null;

create or replace function public.marcar_bienvenida_estudiante()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_marcada boolean;
begin
  if auth.uid() is null or coalesce(auth.jwt() ->> 'is_anonymous', 'false') <> 'true' then
    raise exception 'Esta bienvenida requiere una sesión de estudiante.';
  end if;

  update public.estudiantes
     set bienvenida_estudiante_completada_at = coalesce(bienvenida_estudiante_completada_at, now())
   where auth_user_id = auth.uid()
     and activo = true
     and debe_cambiar_nip = false
   returning true into v_marcada;

  if v_marcada is null then
    raise exception 'No encontramos tu sesión de estudiante.';
  end if;

  return v_marcada;
end;
$$;

revoke execute on function public.marcar_bienvenida_estudiante() from public, anon;
grant execute on function public.marcar_bienvenida_estudiante() to authenticated;

commit;
