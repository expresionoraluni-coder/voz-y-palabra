-- El wrapper correcto debe rodear la llamada auth.jwt(), no la expresión
-- completa, para que Postgres la trate como initplan.
drop policy if exists "todos leen faq activa" on public.faq_articulos;
create policy "todos leen faq activa" on public.faq_articulos for select to authenticated using (
  (select public.es_administrador_activo())
  or (
    activo and (
      (coalesce(((select auth.jwt()) ->> 'is_anonymous'), 'false') = 'true' and audiencia in ('estudiante', 'ambos'))
      or ((select public.es_docente_activo()) and audiencia in ('docente', 'ambos'))
    )
  )
);
