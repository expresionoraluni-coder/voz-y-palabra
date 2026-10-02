-- Contratos de concurrencia e integridad estructural.
-- No inserta datos: verifica que el esquema canónico conserva los locks,
-- índices únicos y campos de versión que usan las acciones de servidor.
begin;
select plan(10);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.entregas'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) like '%(estudiante_id, actividad_id)%'
  ),
  'concurrencia: una actividad solo puede tener una entrega por estudiante'
);

select ok(
  exists (
    select 1 from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'guardar_entrega_auto'
      and pg_get_functiondef(oid) like '%for update%'
  ),
  'concurrencia: guardar_entrega_estudiante bloquea la fila existente'
);

select ok(
  exists (
    select 1 from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'proteger_reporte_atencion'
  ),
  'concurrencia: reportes conserva el trigger de protección de atención'
);

select ok(
  exists (
    select 1 from pg_attribute
    where attrelid = 'public.reportes'::regclass
      and attname = 'updated_at'
      and not attisdropped
  ),
  'concurrencia: reportes tiene una versión temporal para detectar conflictos'
);

select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.reportes'::regclass
      and tgname = 'trg_proteger_reporte_atencion'
      and not tgisinternal
  ),
  'concurrencia: el trigger de reportes está instalado'
);

select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.reportes'::regclass
      and tgname = 'trg_registrar_evento_reporte_atencion'
      and not tgisinternal
  ),
  'concurrencia: cada atención puede auditarse en reporte_eventos'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.reportes'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%estado%'
  ),
  'concurrencia: reportes conserva restricciones de estado'
);

select ok(
  exists (
    select 1 from pg_index
    where indrelid = 'public.eventos'::regclass
      and indisunique
      and pg_get_indexdef(indexrelid) like '%grupo_id, actividad_id%'
  ),
  'concurrencia: una apertura de actividad no se duplica por grupo'
);

select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.reportes'::regclass
      and tgname = 'trg_proteger_cuota_reportes'
      and not tgisinternal
  ),
  'concurrencia: la cuota de reportes se aplica en la base'
);

select ok(
  exists (
    select 1 from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'registrar_evento_reporte_atencion'
      and prosecdef
  ),
  'concurrencia: la auditoría de atención usa una función protegida'
);

select * from finish();
rollback;
