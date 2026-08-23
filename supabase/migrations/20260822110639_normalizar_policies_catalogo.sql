begin;

-- Evita la comprobación de rol obsoleta, que no distingue bien las sesiones
-- anónimas porque Supabase las ejecuta con el rol authenticated.
drop policy if exists "cualquiera con sesión lee tipos de actividad" on public.tipos_actividad;
drop policy if exists "sesión lee tipos de actividad" on public.tipos_actividad;
create policy "sesión lee tipos de actividad" on public.tipos_actividad
  for select to authenticated using ((select auth.uid()) is not null);

drop policy if exists "cualquiera con sesión lee insignias" on public.insignias;
drop policy if exists "sesión lee insignias" on public.insignias;
create policy "sesión lee insignias" on public.insignias
  for select to authenticated using ((select auth.uid()) is not null);

commit;
