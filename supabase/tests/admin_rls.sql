-- Regresiones mínimas del contrato administrativo: provisión por tabla,
-- MFA AAL2 y actualización de reportes únicamente desde los campos de
-- atención. Todo se revierte al terminar la prueba.

begin;
select plan(10);

-- Los fixtures administrativos no representan un alta docente. El trigger de
-- invitación se prueba por separado; se desactiva solo dentro de esta
-- transacción de pruebas y queda restaurado por ROLLBACK.
alter table auth.users disable trigger validar_invitacion_alta_docente;
insert into auth.users (id, email, email_confirmed_at) values
  ('99999999-0000-0000-0000-000000000003', '__test__admin@example.com', now());
insert into administradores (id, nombre, activo) values
  ('99999999-0000-0000-0000-000000000003', '__test__ Administrador', true);
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, secret) values
  ('eeeeeeee-0000-0000-0000-000000000003', '99999999-0000-0000-0000-000000000003', '__test__ TOTP', 'totp', 'verified', 'JBSWY3DPEHPK3PXP');
alter table auth.users enable trigger validar_invitacion_alta_docente;
insert into reportes (
  id, reportante_id, reportante_tipo, docente_id, grupo_id, categoria, descripcion, contexto
) values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'docente',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444',
  'docente_grupo',
  '__test__ reporte administrativo',
  '{}'::jsonb
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}', true);

select ok(not public.es_administrador_activo(), 'admin: una cuenta sin factor verificado no pasa el guard AAL2');
select is_empty(
  $$ select id from reportes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'admin: una cuenta sin AAL2 no puede leer reportes'
);
select is_empty(
  $$ select id from reporte_eventos $$,
  'admin: una cuenta sin AAL2 no puede leer el historial'
);
select ok(has_column_privilege('authenticated', 'public.reportes', 'estado', 'UPDATE'), 'admin: estado queda habilitado para atención');
select ok(not has_column_privilege('authenticated', 'public.reportes', 'descripcion', 'UPDATE'), 'admin: descripción no queda habilitada para actualización directa');
select is_empty(
  $$ select id from reporte_eventos where reporte_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'admin: la policy de historial no expone registros sin AAL2'
);

select lives_ok(
  $$ select public.es_administrador_activo() $$,
  'admin: el guard se puede evaluar con una sesión autenticada'
);
select is(
  (select estado from reportes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'recibido',
  'admin: el reporte de prueba conserva su estado'
);

set_config('request.jwt.claims', '{"sub":"99999999-0000-0000-0000-000000000003","role":"authenticated","aal":"aal2"}', true);
select ok(public.es_administrador_activo(), 'admin: una cuenta con TOTP verificado y AAL2 pasa el guard');
select ok(not is_empty(
  $$ select id from reportes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$
), 'admin: una cuenta con TOTP verificado y AAL2 puede leer reportes');

rollback;
