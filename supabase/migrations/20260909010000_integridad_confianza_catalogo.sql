begin;

-- La aplicación trabaja con una escala de confianza de 1 a 5.  Normaliza
-- cualquier dato histórico fuera de esa escala antes de endurecer el límite.
alter table public.autoevaluaciones_confianza
  drop constraint if exists autoevaluaciones_confianza_valor_check;

update public.autoevaluaciones_confianza
set valor = greatest(1, least(5, round(valor / 25.0)::integer + 1))
where valor < 1 or valor > 5;

alter table public.autoevaluaciones_confianza
  add constraint autoevaluaciones_confianza_valor_check
  check (valor between 1 and 5);

-- Evita que dos ediciones concurrentes creen actividades o tipos duplicados
-- aunque ambas pasen primero por la validación de la interfaz.
create unique index if not exists tipos_actividad_nombre_unico
  on public.tipos_actividad(lower(btrim(nombre)));

create unique index if not exists unidades_orden_unico
  on public.unidades(orden);

create unique index if not exists actividades_orden_unico_por_unidad
  on public.actividades(unidad_id, orden);

create unique index if not exists actividades_titulo_unico_por_unidad
  on public.actividades(unidad_id, lower(btrim(titulo)));

commit;
