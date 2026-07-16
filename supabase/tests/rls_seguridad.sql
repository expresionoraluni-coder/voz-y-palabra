-- Pruebas de regresión para los hallazgos de la auditoría de seguridad
-- (VP-C1, VP-C2, VP-A1, VP-A2, VP-B4) y para cambiar_nip_estudiante. Corre
-- con `supabase test db`
-- (requiere `supabase init` + Docker) o pegando el contenido completo en
-- el SQL Editor del dashboard de Supabase.
--
-- Todo corre dentro de una sola transacción que termina en ROLLBACK: no
-- deja ningún dato de prueba en la base, ni siquiera si algo falla a
-- medio camino (Postgres descarta la transacción abierta si la conexión
-- se corta antes del ROLLBACK explícito).
--
-- Los datos de prueba usan el prefijo "__test__" y UUIDs fijos que
-- empiezan en 11111111.../99999999... para que sea obvio que son falsos
-- si algo llegara a persistir por error.

-- pgtap se instala una sola vez, fuera de la transacción de prueba (es
-- una capacidad permanente de la base, no un dato de prueba a revertir).
create extension if not exists pgtap with schema extensions;

begin;
select plan(15);

-- ============================================================
-- Fixtures
-- ============================================================
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', '__test__docente@example.com'),
  ('22222222-2222-2222-2222-222222222222', '__test__estudiante-boleta@example.com'),
  ('33333333-3333-3333-3333-333333333333', '__test__estudiante@example.com'),
  ('99999999-0000-0000-0000-000000000001', '__test__sesion-login@example.com'),
  ('99999999-0000-0000-0000-000000000002', '__test__sesion-invitacion@example.com');

insert into docentes (id, nombre, correo) values
  ('11111111-1111-1111-1111-111111111111', '__test__ Docente', '__test__docente@example.com');

insert into grupos (id, nombre, codigo_acceso, docente_id) values
  ('44444444-4444-4444-4444-444444444444', '__test__ Grupo', '__TEST__GRUPO', '11111111-1111-1111-1111-111111111111');

insert into estudiantes (id, auth_user_id, nombre, grupo_id, nip_hash) values
  ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', '__test__ Estudiante',
   '44444444-4444-4444-4444-444444444444', extensions.crypt('1234', extensions.gen_salt('bf')));

insert into unidades (id, nombre, orden) values
  ('66666666-6666-6666-6666-666666666666', '__test__ Unidad', 999);

insert into tipos_actividad (id, nombre) values
  ('77777777-7777-7777-7777-777777777777', '__test__ tipo');

insert into actividades (id, unidad_id, tipo_id, titulo) values
  ('88888888-8888-8888-8888-888888888888', '66666666-6666-6666-6666-666666666666',
   '77777777-7777-7777-7777-777777777777', '__test__ actividad');

insert into entregas (id, estudiante_id, actividad_id, respuesta, evaluacion_docente) values
  ('99999999-9999-9999-9999-999999999999', '55555555-5555-5555-5555-555555555555',
   '88888888-8888-8888-8888-888888888888', '{}'::jsonb, null);

-- ============================================================
-- VP-C1: el estudiante no puede falsificar la evaluación de la
-- docente ni reasignar su entrega, pero sí puede seguir editando
-- su propia respuesta.
-- ============================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);

select throws_ok(
  $$ update entregas set evaluacion_docente = 'logrado' where id = '99999999-9999-9999-9999-999999999999' $$,
  'P0001', 'No puedes modificar la evaluación de la docente.',
  'VP-C1: estudiante no puede falsificar evaluacion_docente'
);

select lives_ok(
  $$ update entregas set respuesta = '{"texto":"cambiado"}'::jsonb where id = '99999999-9999-9999-9999-999999999999' $$,
  'VP-C1: estudiante sí puede seguir editando su propia respuesta'
);

select throws_ok(
  $$ update entregas set actividad_id = gen_random_uuid() where id = '99999999-9999-9999-9999-999999999999' $$,
  'P0001', 'No puedes reasignar esta entrega.',
  'VP-C1: estudiante no puede reasignar la entrega a otra actividad'
);

reset role;

-- La docente dueña del grupo sí puede evaluar (que el trigger no bloquee
-- el caso legítimo).
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select lives_ok(
  $$ update entregas set evaluacion_docente = 'logrado' where id = '99999999-9999-9999-9999-999999999999' $$,
  'VP-C1: la docente dueña del grupo sí puede evaluar'
);

reset role;

-- ============================================================
-- VP-C2: ya no existe ninguna policy de UPDATE en estudiantes que
-- un estudiante pueda usar para editar su propia fila.
-- ============================================================
select is_empty(
  $$ select policyname from pg_policies
     where schemaname = 'public' and tablename = 'estudiantes' and cmd = 'UPDATE' $$,
  'VP-C2: no existe ninguna policy de UPDATE en estudiantes'
);

-- ============================================================
-- agregar_estudiantes_con_boleta: siembra el NIP inicial desde la boleta
-- y marca debe_cambiar_nip para forzar que lo cambie en su primer ingreso.
-- ============================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select ok(
  (select bool_and(debe_cambiar_nip) from agregar_estudiantes_con_boleta(
    '44444444-4444-4444-4444-444444444444',
    '[{"nombre":"__test__ Estudiante Boleta","boleta":"20260099"}]'::jsonb
  )),
  'agregar_estudiantes_con_boleta: marca debe_cambiar_nip = true'
);

reset role;

-- Simula que ya inició sesión por primera vez (agregar_estudiantes_con_boleta
-- no liga auth_user_id; eso solo pasa en el primer ingreso real).
update estudiantes set auth_user_id = '22222222-2222-2222-2222-222222222222'
  where nombre = '__test__ Estudiante Boleta';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

select ok(
  cambiar_nip_estudiante('0099', '4321') is null,
  'cambiar_nip: acepta el NIP sembrado desde la boleta como NIP actual'
);

select ok(
  not (select debe_cambiar_nip from estudiantes where nombre = '__test__ Estudiante Boleta'),
  'cambiar_nip: apaga debe_cambiar_nip tras el cambio'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

do $$
declare
  v_id uuid;
begin
  select id into v_id from estudiantes where nombre = '__test__ Estudiante Boleta';
  perform reiniciar_nip_estudiante(v_id);
end $$;

select ok(
  (select nip_hash is null and auth_user_id is null and not debe_cambiar_nip
   from estudiantes where nombre = '__test__ Estudiante Boleta'),
  'reiniciar_nip_estudiante: limpia nip_hash, auth_user_id y debe_cambiar_nip'
);

reset role;

-- ============================================================
-- cambiar_nip_estudiante: el estudiante puede cambiar su propio NIP ya
-- logueado, pero solo si conoce el NIP actual (se ejecuta antes de VP-A1
-- para usar el estudiante de prueba antes de que ese bloque lo bloquee).
-- ============================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);

select ok(
  cambiar_nip_estudiante('0000', '5678') = 'Tu NIP actual no es correcto.',
  'cambiar_nip: rechaza si el NIP actual no coincide'
);

select ok(
  cambiar_nip_estudiante('1234', '5678') is null,
  'cambiar_nip: acepta y cambia el NIP cuando el actual es correcto'
);

select ok(
  (select nip_hash from estudiantes where id = '55555555-5555-5555-5555-555555555555')
    = extensions.crypt('5678', (select nip_hash from estudiantes where id = '55555555-5555-5555-5555-555555555555')),
  'cambiar_nip: el hash guardado corresponde al NIP nuevo'
);

reset role;

-- VP-A1 (abajo) espera que el NIP del estudiante de prueba siga siendo
-- '1234' y que no arrastre intentos_fallidos de este bloque.
update estudiantes
  set nip_hash = extensions.crypt('1234', extensions.gen_salt('bf')), intentos_fallidos = 0, bloqueado_hasta = null
  where id = '55555555-5555-5555-5555-555555555555';

-- ============================================================
-- VP-B4: docentes.correo no se puede cambiar por API directa.
-- ============================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select throws_ok(
  $$ update docentes set correo = 'otra@cosa.com' where id = '11111111-1111-1111-1111-111111111111' $$,
  'P0001', 'El correo se administra desde tu inicio de sesión, no se puede editar aquí.',
  'VP-B4: docente no puede cambiar su correo por API directa'
);

reset role;

-- ============================================================
-- VP-A1: bloqueo tras 5 NIP fallidos seguidos, incluso si el 6to
-- intento trae el NIP correcto.
-- ============================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-0000-0000-0000-000000000001","role":"authenticated"}', true);

do $$
begin
  for i in 1..5 loop
    begin
      perform ingresar_estudiante('__TEST__GRUPO', '__test__ Estudiante', '0000');
    exception when others then null;
    end;
  end loop;
end $$;

-- ingresar_estudiante ya no lanza excepción para "NIP incorrecto" ni
-- "ya bloqueado" (si lo hiciera, la transacción de esa misma llamada
-- deshace el incremento del contador junto con todo lo demás) — devuelve
-- el error como dato en la columna `error`.
select ok(
  (select error from ingresar_estudiante('__TEST__GRUPO', '__test__ Estudiante', '1234') limit 1) like 'Demasiados intentos%',
  'VP-A1: bloqueado tras 5 NIP fallidos, incluso con el NIP correcto'
);

reset role;

-- ============================================================
-- VP-A2: mismo bloqueo para el código de invitación docente. Se
-- sustituye temporalmente el hash real (se revierte con el ROLLBACK
-- final) para no depender de conocer el código verdadero.
-- ============================================================
update configuracion_plataforma
  set valor = extensions.crypt('CODIGO-DE-PRUEBA', extensions.gen_salt('bf'))
  where clave = 'codigo_invitacion_docente_hash';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-0000-0000-0000-000000000002","role":"authenticated"}', true);

do $$
begin
  for i in 1..5 loop
    begin
      perform crear_perfil_docente('__test__ Nueva Docente', 'codigo-incorrecto');
    exception when others then null;
    end;
  end loop;
end $$;

-- mismo cambio de contrato que ingresar_estudiante.
select ok(
  crear_perfil_docente('__test__ Nueva Docente', 'CODIGO-DE-PRUEBA') like 'Demasiados intentos%',
  'VP-A2: bloqueado tras 5 intentos fallidos del código de invitación'
);

reset role;

select * from finish();
rollback;
