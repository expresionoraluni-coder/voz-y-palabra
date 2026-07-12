-- Voz y Palabra · esquema inicial de base de datos (Fase 1)
-- Copia y pega este archivo completo en Supabase → SQL Editor → New query → Run

-- ============================================================
-- 1. QUIÉN ES QUIÉN
-- ============================================================

create table docentes (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  correo text not null,
  created_at timestamptz not null default now()
);

create table grupos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  codigo_acceso text not null unique,
  docente_id uuid not null references docentes(id) on delete cascade,
  ciclo_escolar text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table estudiantes (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  nombre text not null,
  grupo_id uuid not null references grupos(id) on delete cascade,
  nip_hash text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. QUÉ SE ENSEÑA
-- ============================================================

create table unidades (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  orden int not null,
  descripcion text,
  reto_comunicativo text
);

create table tipos_actividad (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text
);

create table actividades (
  id uuid primary key default gen_random_uuid(),
  unidad_id uuid not null references unidades(id) on delete cascade,
  tipo_id uuid not null references tipos_actividad(id),
  titulo text not null,
  instrucciones text,
  contenido jsonb not null default '{}'::jsonb,
  orden int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 3. QUÉ HACE EL ESTUDIANTE
-- ============================================================

create table entregas (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references estudiantes(id) on delete cascade,
  actividad_id uuid not null references actividades(id) on delete cascade,
  respuesta jsonb,
  archivo_url text,
  estado text not null default 'completada' check (estado in ('completada', 'pendiente_revision', 'revisada')),
  created_at timestamptz not null default now(),
  unique (estudiante_id, actividad_id)
);

create table reflexiones (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references estudiantes(id) on delete cascade,
  actividad_id uuid references actividades(id) on delete cascade,
  unidad_id uuid references unidades(id) on delete cascade,
  texto text not null,
  created_at timestamptz not null default now()
);

create table autoevaluaciones_confianza (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references estudiantes(id) on delete cascade,
  unidad_id uuid not null references unidades(id) on delete cascade,
  momento text not null check (momento in ('inicio', 'cierre')),
  valor int not null check (valor between 0 and 100),
  created_at timestamptz not null default now(),
  unique (estudiante_id, unidad_id, momento)
);

-- ============================================================
-- 4. MOTIVACIÓN
-- ============================================================

create table insignias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  icono text
);

create table insignias_otorgadas (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references estudiantes(id) on delete cascade,
  insignia_id uuid not null references insignias(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (estudiante_id, insignia_id)
);

-- ============================================================
-- 5. COMUNICACIÓN Y SEGUIMIENTO
-- ============================================================

create table retroalimentacion_docente (
  id uuid primary key default gen_random_uuid(),
  entrega_id uuid not null references entregas(id) on delete cascade,
  docente_id uuid not null references docentes(id) on delete cascade,
  comentario text not null,
  created_at timestamptz not null default now()
);

create table avisos (
  id uuid primary key default gen_random_uuid(),
  docente_id uuid not null references docentes(id) on delete cascade,
  grupo_id uuid references grupos(id) on delete cascade,
  unidad_id uuid references unidades(id) on delete cascade,
  titulo text not null,
  mensaje text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 6. SEGURIDAD (RLS) — cada tabla protegida a nivel de base de datos
-- ============================================================

alter table docentes enable row level security;
alter table grupos enable row level security;
alter table estudiantes enable row level security;
alter table unidades enable row level security;
alter table tipos_actividad enable row level security;
alter table actividades enable row level security;
alter table entregas enable row level security;
alter table reflexiones enable row level security;
alter table autoevaluaciones_confianza enable row level security;
alter table insignias enable row level security;
alter table insignias_otorgadas enable row level security;
alter table retroalimentacion_docente enable row level security;
alter table avisos enable row level security;

-- función auxiliar: ¿el usuario que hace la consulta es un estudiante, y cuál es su fila?
create or replace function estudiante_actual()
returns uuid
language sql stable
as $$
  select id from estudiantes where auth_user_id = auth.uid()
$$;

-- docentes: solo ve y edita su propio perfil
create policy "docente ve su propio perfil" on docentes
  for select using (id = auth.uid());
create policy "docente edita su propio perfil" on docentes
  for update using (id = auth.uid());

-- grupos: el docente administra los suyos; el estudiante solo lee el suyo
create policy "docente administra sus grupos" on grupos
  for all using (docente_id = auth.uid());
create policy "estudiante lee su grupo" on grupos
  for select using (id = (select grupo_id from estudiantes where id = estudiante_actual()));

-- estudiantes: el docente administra los de sus grupos; el estudiante lee/edita su propia fila
create policy "docente administra estudiantes de sus grupos" on estudiantes
  for all using (grupo_id in (select id from grupos where docente_id = auth.uid()));
create policy "estudiante lee su propia fila" on estudiantes
  for select using (auth_user_id = auth.uid());
create policy "estudiante edita su propia fila" on estudiantes
  for update using (auth_user_id = auth.uid());

-- unidades y tipos_actividad: catálogo de lectura abierta para cualquiera con sesión
create policy "cualquiera con sesión lee unidades" on unidades
  for select using (auth.role() = 'authenticated');
create policy "docente administra unidades" on unidades
  for all using (auth.jwt()->>'role' = 'authenticated' and exists (select 1 from docentes where id = auth.uid()));
create policy "cualquiera con sesión lee tipos de actividad" on tipos_actividad
  for select using (auth.role() = 'authenticated');

-- actividades: lectura abierta con sesión; solo el docente administra
create policy "cualquiera con sesión lee actividades" on actividades
  for select using (auth.role() = 'authenticated');
create policy "docente administra actividades" on actividades
  for all using (exists (select 1 from docentes where id = auth.uid()));

-- entregas: el estudiante ve y crea las suyas; el docente ve las de sus grupos
create policy "estudiante administra sus entregas" on entregas
  for all using (estudiante_id = estudiante_actual());
create policy "docente ve entregas de sus grupos" on entregas
  for select using (
    estudiante_id in (
      select e.id from estudiantes e join grupos g on g.id = e.grupo_id
      where g.docente_id = auth.uid()
    )
  );

-- reflexiones: mismo patrón que entregas
create policy "estudiante administra sus reflexiones" on reflexiones
  for all using (estudiante_id = estudiante_actual());
create policy "docente ve reflexiones de sus grupos" on reflexiones
  for select using (
    estudiante_id in (
      select e.id from estudiantes e join grupos g on g.id = e.grupo_id
      where g.docente_id = auth.uid()
    )
  );

-- autoevaluaciones_confianza: mismo patrón
create policy "estudiante administra su confianza" on autoevaluaciones_confianza
  for all using (estudiante_id = estudiante_actual());
create policy "docente ve confianza de sus grupos" on autoevaluaciones_confianza
  for select using (
    estudiante_id in (
      select e.id from estudiantes e join grupos g on g.id = e.grupo_id
      where g.docente_id = auth.uid()
    )
  );

-- insignias: catálogo de lectura abierta
create policy "cualquiera con sesión lee insignias" on insignias
  for select using (auth.role() = 'authenticated');

-- insignias_otorgadas: el estudiante solo lee las suyas (se otorgan desde el servidor, no desde el navegador del estudiante)
create policy "estudiante lee sus insignias" on insignias_otorgadas
  for select using (estudiante_id = estudiante_actual());
create policy "docente ve insignias de sus grupos" on insignias_otorgadas
  for select using (
    estudiante_id in (
      select e.id from estudiantes e join grupos g on g.id = e.grupo_id
      where g.docente_id = auth.uid()
    )
  );

-- retroalimentacion_docente: el docente escribe; el estudiante dueño de la entrega la lee
create policy "docente administra su retroalimentación" on retroalimentacion_docente
  for all using (docente_id = auth.uid());
create policy "estudiante lee retroalimentación de sus entregas" on retroalimentacion_docente
  for select using (
    entrega_id in (select id from entregas where estudiante_id = estudiante_actual())
  );

-- avisos: el docente administra; el estudiante lee los de su grupo o los globales
create policy "docente administra sus avisos" on avisos
  for all using (docente_id = auth.uid());
create policy "estudiante lee avisos de su grupo" on avisos
  for select using (
    grupo_id is null
    or grupo_id = (select grupo_id from estudiantes where id = estudiante_actual())
  );

-- ============================================================
-- 7. DATOS INICIALES: los 9 tipos de actividad y las 3 unidades
-- ============================================================

insert into tipos_actividad (nombre, descripcion) values
  ('clasificacion', 'Arrastra elementos a la categoría correcta'),
  ('opcion_justificacion', 'Elige una opción y justifica en 1-2 líneas'),
  ('redaccion_checklist', 'Redacta con un límite y autorrevisa con checklist'),
  ('encontrar_corregir', 'Detecta errores marcados en un texto y los reescribe'),
  ('constructor_ramificado', 'Elige una estructura y llena un esqueleto de párrafos'),
  ('comparador', 'Analiza dos textos u opciones lado a lado'),
  ('grabacion_rubrica', 'Graba su voz y se autoevalúa con una rúbrica'),
  ('reflexion_confianza', 'Responde una reflexión o mueve un control de confianza'),
  ('etiquetado_texto', 'Selecciona un fragmento de texto y le asigna una etiqueta');

insert into unidades (nombre, orden, descripcion, reto_comunicativo) values
  ('De la lengua al texto', 1, 'Comunicación, lenguaje, lengua, habla, norma, niveles y funciones de la lengua, el texto y sus propiedades.', 'Entregar la idea central de un texto largo en 5 líneas.'),
  ('Exposición escrita', 2, 'Rasgos del texto expositivo y los 5 modelos expositivos.', 'Redactar un texto expositivo bien estructurado.'),
  ('Exposición oral', 3, 'Cualidades y técnicas de la exposición oral.', 'Exponer ante el grupo con seguridad.');

-- ============================================================
-- 8. CAMBIOS APLICADOS DESPUÉS DE ESTE ARCHIVO (directo en producción)
-- ============================================================
-- Este archivo es la foto del esquema inicial (Fase 1); varias correcciones
-- y features posteriores se aplicaron directo en Supabase y no siempre se
-- reflejaron aquí. Las más importantes, por si hay que reconstruir desde cero:
--
-- 1. estudiante_actual() y grupo_del_estudiante_actual() se volvieron
--    SECURITY DEFINER para romper una recursión infinita en las políticas
--    de "grupos" y "estudiantes".
-- 2. reflexiones_unica_por_actividad: constraint único completo en
--    (estudiante_id, actividad_id) en vez de un índice parcial (PostgREST
--    no puede inferir on_conflict contra índices parciales).
--
-- 3. Gate de registro docente (código de invitación):
--    - tabla configuracion_plataforma (clave, valor) sin políticas RLS
--      (solo accesible vía funciones SECURITY DEFINER). Guarda el hash
--      (pgcrypto) del código de invitación bajo la clave
--      'codigo_invitacion_docente_hash'.
--    - se eliminó la policy "docente crea su propio perfil" (insert
--      directo a la tabla docentes ya no está permitido para nadie).
--    - función crear_perfil_docente(p_nombre, p_codigo_invitacion) es el
--      único camino para crear una fila en docentes: verifica el código
--      contra el hash guardado antes de insertar. Sin este código, un
--      usuario autenticado puede iniciar sesión pero nunca obtiene perfil
--      docente (ver /ingreso/profesora/verificar en el frontend).
--
-- 4. NIP de estudiantes (evita suplantación por nombre):
--    - columna estudiantes.nip_hash (reemplaza al pin_hash original de
--      este archivo, que nunca se llegó a usar).
--    - ingresar_estudiante(p_codigo, p_nombre, p_nip) ahora exige un NIP
--      de 4 dígitos: si nip_hash es null, lo registra (primera vez); si ya
--      existe, debe coincidir para poder re-vincular auth_user_id. Antes,
--      cualquiera que escribiera el nombre correcto se re-vinculaba sin
--      más validación.
--    - función reiniciar_nip_estudiante(p_estudiante_id) permite a la
--      docente dueña del grupo borrar el nip_hash de un estudiante que lo
--      olvidó, para que pueda registrar uno nuevo en su siguiente ingreso.
--
-- 5. Insignias 'Unidad 3 completa' y 'Voz y Palabra completo' agregadas al
--    catálogo, con su lógica correspondiente en verificar_insignias().
--
-- 6. Predicción antes de cada actividad (ciclo predicción → cierre):
--    - reflexiones.momento ('prediccion' | 'cierre'), default 'cierre' para
--      no romper filas existentes. El unique constraint pasó de
--      (estudiante_id, actividad_id) a (estudiante_id, actividad_id, momento)
--      porque ahora puede haber dos filas legítimas por actividad.
--    - el estudiante predice qué se le va a dificultar antes de ver el
--      contenido de la actividad; al cerrar, la reflexión le muestra de
--      vuelta su propia predicción y le pregunta qué tan cierta fue.
--    - verificar_insignias() solo cuenta momento='cierre' para 'Primera
--      reflexión' y 'Mente reflexiva', para no inflar el conteo con
--      predicciones. Lo mismo aplica a los puntos en /estudiante/inicio y a
--      las consultas de reflexiones del portafolio y la ficha del docente.
--
-- 7. Fix: "duplicate key value violates unique constraint
--    estudiantes_auth_user_id_key" al entrar con un nombre distinto sin
--    cerrar sesión (mismo dispositivo/sesión ya ligado a otro estudiante).
--    ingresar_estudiante() ahora libera (auth_user_id = null) cualquier otra
--    fila que ya tuviera ligada esta sesión, justo antes de ligarla a la
--    fila actual — solo después de validar el NIP cuando ya existía, para
--    no debilitar la protección contra suplantación (un intento con NIP
--    incorrecto no libera nada).
--
-- 8. Datos reales de desempeño en entregas (antes solo existía "entregado
--    o no", el dashboard de la docente no tenía forma de saber si las
--    respuestas eran buenas):
--    - entregas.puntaje_auto (0-100, nullable): calculado en el navegador
--      al entregar, solo para clasificacion y etiquetado_texto (los únicos
--      tipos con respuesta objetivamente correcta definida en `contenido`).
--    - entregas.evaluacion_docente ('logrado'|'en_proceso'|'necesita_apoyo',
--      nullable): juicio cualitativo rápido de la docente al revisar una
--      entrega abierta (opción_justificación, encontrar_corregir,
--      comparador, redacción_checklist, constructor_ramificado,
--      grabación_rúbrica), capturado desde el mismo componente de
--      comentarios. Existe una policy UPDATE para docentes en "entregas"
--      ("docente actualiza estado de entregas de sus grupos") que no está
--      en este archivo porque se agregó directo en producción.
--    - El dashboard de grupo agrega precisión promedio por tipo de
--      actividad (ordenada de peor a mejor) y distribución de evaluación
--      cualitativa; también se añadió una alerta de sobreconfianza real
--      (confianza declarada alta pero puntaje_auto promedio bajo, no solo
--      "dice sentirse seguro pero no ha hecho nada").
--    - /estudiante/inicio sugiere repasar (práctica de recuperación) las
--      actividades auto-calificadas con puntaje_auto < 70.
--
-- 9. Baja de estudiantes (para cuando dan de baja la materia):
--    - estudiantes.activo boolean not null default true.
--    - ingresar_estudiante() rechaza el login si activo = false, con un
--      mensaje explícito ("Tu cuenta fue dada de baja...").
--    - la docente puede dar de baja (reversible, conserva el historial) o
--      eliminar (permanente, borra entregas/reflexiones/insignias por
--      cascada) desde la ficha del estudiante. El roster del grupo y sus
--      métricas (avance promedio, activos esta semana, etc.) solo
--      consideran estudiantes activos; los dados de baja aparecen en una
--      sección aparte al final, con opción de reactivar.
--
-- 10. Ayuda visible cuando el estudiante olvida su NIP: tras 3 intentos
--     fallidos seguidos en /ingreso/estudiante, se muestra un aviso
--     indicándole que le pida a su profesora que reinicie su NIP desde su
--     ficha (botón "Reiniciar NIP", ya existente). Es un contador del lado
--     del cliente, no un bloqueo — no impide seguir intentando.
--
-- 11. Actividades más útiles, sin IA (análisis completo compartido con el
--     usuario antes de implementar):
--     - Bloqueos anti-payasada (impiden entregar, no solo avisan):
--       redaccion_checklist exige un mínimo de palabras (mitad del límite,
--       piso de 15); encontrar_corregir bloquea si la corrección es igual
--       al texto original y exige detalle mínimo en "qué encontraste";
--       grabacion_rubrica exige ≥8s de grabación; comparador y
--       constructor_ramificado exigen mínimo de palabras por campo y
--       bloquean si dos campos que deberían contrastar son casi idénticos
--       (similitud de Jaccard sobre palabras de 3+ letras, ver
--       src/lib/similitud-texto.ts); opcion_justificacion exige mínimo de
--       palabras en la justificación.
--     - Ideas clave / fragmento marcado (avisos suaves, no bloquean):
--       opcion_justificacion y encontrar_corregir aceptan un campo opcional
--       en `contenido` — ideas_clave (string[], comparación por palabra
--       clave insensible a acentos, ver src/lib/ideas-clave.ts) y,
--       exclusivo de encontrar_corregir, fragmento_erroneo (string, para
--       errores puntuales en vez de estructurales). Las 5 actividades
--       existentes de estos dos tipos ya tienen ideas_clave rellenado
--       directo en producción (el usuario autorizó completar esto sin
--       pedírselo a la docente).
--     - Matriz de confusión por elemento (clasificacion/etiquetado_texto):
--       en el dashboard de grupo, sección "Dónde se equivoca el grupo" —
--       compara respuesta.elegidas contra categoria_correcta/
--       etiqueta_correcta elemento por elemento (no solo el % del tipo
--       completo) y agrega cuántas veces se repite cada confusión
--       específica en todo el grupo. Mismos datos ya guardados, solo más
--       finos. Verificado en vivo con datos reales del "circuito de la
--       comunicación".
--     - Overlap de vocabulario con la fuente (redaccion_checklist): compara
--       las palabras de contenido más frecuentes de contenido.texto_fuente
--       (sin palabras vacías) contra el texto del estudiante y muestra
--       "retomas X de Y ideas clave" (ver src/lib/analisis-texto.ts,
--       overlapConFuente/palabrasClave). Aviso suave, no bloquea.
--     - Consistencia de volumen (grabacion_rubrica): coeficiente de
--       variación de las ventanas de amplitud donde sí hubo habla (excluye
--       silencios), invertido a una escala 0-100 donde 100 = muy estable
--       (ver src/lib/analisis-audio.ts, campo consistenciaVolumen). Se
--       muestra como "volumen estable/irregular" tanto al estudiante como
--       en la ficha de la docente. null si hubo menos de 5 ventanas
--       habladas (grabación demasiado corta o silenciosa para medir).
--     - Calibración de confianza por actividad (no solo por unidad):
--       reflexiones.confianza (int 1-5, nullable, solo para
--       momento='prediccion') — el estudiante declara qué tan seguro se
--       siente justo antes de empezar la actividad, además de su
--       predicción de texto libre ya existente. Al cerrar (momento=
--       'cierre'), si la actividad es de las auto-calificadas
--       (entregas.puntaje_auto no nulo), se compara la confianza declarada
--       (escalada a 0-100) contra el puntaje real y se le muestra al
--       estudiante un mensaje de calibración concreto (sobreconfianza,
--       subconfianza o bien calibrado). La ficha de la docente muestra la
--       confianza declarada junto al % de acierto por entrega, con aviso
--       visual cuando el desajuste supera 25 puntos. Verificado en vivo:
--       confianza 5/5 declarada + 14% de acierto real produjo el mensaje de
--       sobreconfianza esperado.
--
-- 12. Pendiente de análisis, no implementado todavía (a pedido del usuario,
--     que quiere evaluar antes de tocar código): calendario de repaso
--     espaciado vinculado a fechas que suba la docente (evaluaciones,
--     entregas), y una bitácora/plan de trabajo del estudiante — ambos como
--     herramientas de metacognición y autorregulación más allá de las
--     actividades de expresión en sí.
