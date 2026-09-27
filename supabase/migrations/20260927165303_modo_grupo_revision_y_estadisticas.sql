-- Un grupo de revisión representa un entorno de comprobación del curso, no
-- una cohorte académica. Su modo se consulta tanto para el acceso del
-- estudiante como para excluirlo de los agregados de seguimiento.
alter table public.grupos
  add column if not exists modo text not null default 'curso';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'grupos_modo_check'
      and conrelid = 'public.grupos'::regclass
  ) then
    alter table public.grupos
      add constraint grupos_modo_check
      check (modo in ('curso', 'revision'));
  end if;
end $$;

-- La cohorte de revisión ya existe y fue creada expresamente con ese nombre.
-- No se usan ids ni códigos de acceso en la migración para no acoplarla a
-- datos generados ni exponer identificadores de acceso.
update public.grupos
set modo = 'revision'
where nombre = 'REVISION'
  and modo = 'curso';

create index if not exists grupos_docente_modo_activo_idx
  on public.grupos (docente_id, modo)
  where activo = true;
