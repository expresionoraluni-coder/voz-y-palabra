-- Mantiene la misma regla de seguridad, pero deja auth.jwt() en un initplan
-- explícito para que no se reevalúe una vez por cada fila.
alter policy "solo perfiles docentes permanentes usan unidades"
  on public.unidades
  using (coalesce((((select auth.jwt()) ->> 'is_anonymous')::boolean), false) = false)
  with check (coalesce((((select auth.jwt()) ->> 'is_anonymous')::boolean), false) = false);

alter policy "solo perfiles docentes permanentes usan actividades"
  on public.actividades
  using (coalesce((((select auth.jwt()) ->> 'is_anonymous')::boolean), false) = false)
  with check (coalesce((((select auth.jwt()) ->> 'is_anonymous')::boolean), false) = false);
