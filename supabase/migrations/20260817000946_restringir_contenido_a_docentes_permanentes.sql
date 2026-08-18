-- Defensa adicional: las tablas de contenido no deben aceptar sesiones
-- anónimas, aunque una policy permisiva futura llegara a cambiar.

drop policy if exists "solo perfiles docentes permanentes usan unidades" on public.unidades;
create policy "solo perfiles docentes permanentes usan unidades" on public.unidades
  as restrictive for all to authenticated
  using (coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) = false)
  with check (coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) = false);

drop policy if exists "solo perfiles docentes permanentes usan actividades" on public.actividades;
create policy "solo perfiles docentes permanentes usan actividades" on public.actividades
  as restrictive for all to authenticated
  using (coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) = false)
  with check (coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) = false);
