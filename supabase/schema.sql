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
-- 12. Metacognición y autorregulación más allá de las actividades (las tres
--     herramientas del análisis previo, aprobadas por el usuario):
--     - tabla eventos (docente_id, grupo_id, unidad_id not null, titulo,
--       tipo check in examen/proyecto/entrega/otro, fecha date): la docente
--       carga fechas reales desde /docente/grupos/[id] (componente
--       eventos.tsx, mismo patrón que avisos.tsx). El unidad_id es
--       obligatorio a propósito — es el "conector" que le permite a la
--       plataforma generar recomendaciones sin IA: src/lib/eventos.ts
--       define, por tipo de evento, la frase conectora ("Repasa antes de tu
--       examen", "Antes de tu proyecto, revisa", etc.).
--     - tabla bitacora (estudiante_id, unidad_id, meta, cumplida, unique
--       estudiante+unidad): meta de texto libre por unidad (fijación de
--       metas, Locke & Latham), editable, con marca de cumplida. Visible en
--       /estudiante/unidad/[id] (bitacora.tsx) y también en la ficha de la
--       docente (docente/estudiantes/[id]) porque el usuario pidió que
--       fuera útil para ambos.
--     - /estudiante/calendario: mezcla los eventos reales del grupo con
--       repasos sugeridos (src/lib/calendario-repaso.ts, intervalos
--       crecientes 2/5/10/21 días desde el intento con puntaje_auto < 70,
--       práctica espaciada) en una sola línea de tiempo ordenada por fecha.
--       Cada evento con unidad_id muestra qué actividades de esa unidad
--       conviene repasar o todavía no se han hecho.
--     - /estudiante/progreso ("Mi progreso"): la misma agregación de
--       precisión por tipo de actividad y variedad léxica que ya existía en
--       el dashboard de la docente, filtrada al propio estudiante — nunca
--       comparada contra el grupo, para que sea autoconocimiento y no
--       competencia.
--     - Campanita de recordatorios en /estudiante/inicio: eventos que
--       caen dentro de los próximos 7 días + aviso si todavía no hay meta
--       de bitácora para la unidad activa. No es una tabla de
--       notificaciones nueva, se calcula al cargar la página.
--     - Verificado en vivo con datos de prueba aislados: el examen de
--       Unidad 1 a 4 días generó correctamente "Repasa antes de tu examen:
--       [3 actividades sin hacer]"; la bitácora guardó y marcó cumplida
--       correctamente; el recordatorio combinado (evento + bitácora sin
--       meta) apareció en /estudiante/inicio.
--
-- 13. Auditoría global de experiencia del estudiante (análisis previo
--     compartido con el usuario, aprobado completo — "atiende todo"):
--     - Contraste: se descubrió que text-slate-400 sobre fondo claro da
--       2.56:1 (falla WCAG AA, que exige 4.5:1) — se cambió a
--       text-slate-500 claro / text-slate-400 oscuro en los ~15 usos reales
--       de texto (no en placeholders ni estados disabled, que están
--       exentos). Aplicado también en pantallas de la docente por
--       consistencia del mismo token de diseño.
--     - El slider de confianza (0-100%) ahora tiene botones -5/+5 junto al
--       range, para no depender de arrastrar (WCAG 2.5.7).
--     - Navegación: src/app/estudiante/(hub)/ es un route group nuevo con
--       layout.tsx compartido + bottom-nav.tsx (Inicio/Calendario/
--       Progreso/Portafolio/Insignias) — agrupa inicio, calendario,
--       progreso, portafolio, insignias y unidad/[id] (NO actividad/[id],
--       que se mantiene a pantalla completa sin distracciones). Los route
--       groups no cambian la URL, así que ningún link existente se rompió.
--     - Rendimiento percibido: las consultas independientes en
--       estudiante/actividad/[id] y estudiante/unidad/[id] se agruparon en
--       Promise.all en vez de awaits secuenciales.
--     - El NIP ahora tiene un botón de mostrar/ocultar (ojo) en vez de
--       quedar siempre oculto — evita typos silenciosos sin agregar
--       fricción de doble captura en cada login.
--     - Corregido el texto de instrucciones de "El circuito de la
--       comunicación" (decía "arrastra", el control real es un selector).
--     - El mensaje de racha ya no está enmarcado en pérdida ("no rompas tu
--       racha"): rota entre frases de logro.
--     - middleware.ts: el auth.getUser() ahora está en try/catch — si
--       Supabase no responde, la petición sigue como sesión no verificada
--       en vez de tumbar la página completa.
--     - Se intentó agregar loading.tsx (esqueleto de carga) en
--       src/app/estudiante/ y actividad/[id]/, pero durante la
--       verificación en vivo se observó que, con ese archivo presente,
--       redirect() a /ingreso/estudiante desde una página sin sesión se
--       quedaba mostrando el esqueleto indefinidamente en vez de
--       redirigir. No se logró aislar con certeza si la causa real era
--       loading.tsx o un estado corrupto del servidor de desarrollo tras
--       muchos hot-reloads seguidos — ante la duda, se revirtió: el riesgo
--       de romper el flujo de acceso pesa más que la mejora de percepción
--       de carga. Si se retoma, probar en un entorno limpio y de forma
--       aislada antes de confiar en el resultado.
--
-- 14. Auditoría global de experiencia de la docente (análisis previo
--     compartido con el usuario, aprobado completo — "atiende todo"):
--     - Editor de actividades reutilizable: src/app/docente/unidades/[id]/
--       actividades/actividad-form.tsx es ahora el único formulario, usado
--       tanto por .../nueva (insert) como por
--       .../[actividadId]/editar (update, ruta nueva). El tipo de
--       actividad no se puede cambiar en modo edición (bloquearía la forma
--       del contenido guardado). Cada tarjeta de actividad en
--       docente/unidades/[id] ahora enlaza a editar en vez de ser texto
--       estático.
--     - Clasificación y etiquetado_texto: los elementos/fragmentos ya no
--       se escriben como "texto || categoría" en un textarea — son filas
--       con un input de texto y un <select> poblado en vivo desde las
--       categorías/etiquetas ya escritas arriba, con agregar/quitar fila y
--       un panel de vista previa. Los otros 7 tipos siguen en texto plano
--       por ahora (rollout incremental, como se propuso en el análisis).
--     - Borrador en localStorage (solo modo creación, clave
--       "voz-y-palabra:borrador-actividad:<unidadId>"): se restaura una
--       vez al montar el formulario y se limpia al guardar con éxito.
--     - avisos.tsx ahora tiene botón de eliminar (mismo patrón que ya
--       existía en eventos.tsx).
--     - docente/estudiantes/[id]: se muestra el historial de
--       retroalimentacion_docente debajo de cada entrega — antes se
--       guardaba pero nunca se volvía a leer en ningún lado.
--     - docente/grupos/[id]: barra de pestañas pegajosa (Resumen ·
--       Estudiantes · Contenido) con anclas a las secciones existentes —
--       no se partió la página, solo se agregó navegación interna.
--     - docente/dashboard: cada tarjeta de grupo muestra un badge de
--       "N por revisar" (cuenta agregada de entregas pendientes),
--       calculado en el mismo query, sin tabla nueva.
--     - Tendencia de precisión sin infraestructura nueva: se compara el
--       promedio de puntaje_auto de los últimos 7 días contra los 7
--       anteriores, calculado en vivo a partir de las entregas ya
--       cargadas (no hay snapshots guardados) — se muestra como flecha
--       junto a "Precisión por tipo de actividad" en la página de grupo.
--     - Verificado en vivo con docente y grupo de prueba aislados: crear
--       una actividad de clasificación con la nueva UI de filas guardó el
--       JSON exacto que esperan las demás pantallas; editarla y cambiar el
--       título persistió correctamente; el badge "por revisar" reflejó una
--       entrega de prueba; un comentario guardado se mostró después de
--       recargar la página; un aviso se creó y se borró correctamente; el
--       borrador de localStorage sobrevivió una recarga completa.
--
-- 15. A pedido directo del usuario (no parte del análisis anterior):
--     - Eliminar grupo: nuevo componente eliminar-grupo.tsx en la "Zona de
--       riesgo" al fondo de la página de grupo — pide escribir el nombre
--       exacto del grupo para habilitar el botón (mismo nivel de fricción
--       que borrar un repositorio en GitHub). Se verificó primero que las
--       3 foreign keys que apuntan a grupos.id (estudiantes, avisos,
--       eventos) ya tenían ON DELETE CASCADE, y que desde estudiantes
--       cascada correctamente a entregas/reflexiones/autoevaluaciones_
--       confianza/insignias_otorgadas/bitácora — un solo DELETE FROM
--       grupos limpia todo sin dejar filas huérfanas. Verificado en vivo
--       con un grupo y estudiante de prueba: ambos desaparecieron tras
--       confirmar.
--     - Exportar a Excel: exportar-grupo.tsx genera un CSV en el navegador
--       (Blob + descarga), sin librería nueva ni round-trip al servidor —
--       Excel abre CSV de forma nativa. Se eligió CSV sobre .xlsx real
--       para no agregar una dependencia por un caso de uso que no
--       necesita múltiples hojas ni formato. Columnas: nombre, avance %,
--       entregas, última actividad, días sin actividad — el mismo dato
--       que ya se calcula para la lista de estudiantes de la página,
--       reutilizado tal cual. Incluye BOM UTF-8 para que los acentos no
--       se rompan al abrir en Excel. Verificado en vivo: el CSV generado
--       tiene el encabezado y la fila esperados.
--     - Vista previa de conteo en campos "una por línea": la docente
--       reportó que un salto de línea accidental (pegar desde Word, un
--       Enter de más) parte un elemento en dos sin ningún aviso. Se
--       agregó ContadorLineas en actividad-form.tsx — una fila de chips
--       en vivo debajo de opciones/categorías/conceptos/criterios/
--       checklist/etiquetas/rúbrica mostrando exactamente cuántos
--       elementos se detectaron y cuáles son. Verificado en vivo pegando
--       "Segunda opción partida\npor accidente" — el contador mostró 4
--       chips en vez de 3, haciendo visible el error antes de guardar.
--
-- 16. Confirmación doble al crear un NIP o una contraseña por primera vez
--     (patrón clásico de todo sistema de credenciales, a pedido del
--     usuario):
--     - función estudiante_tiene_nip(p_codigo, p_nombre) — SECURITY
--       DEFINER, solo devuelve un booleano (si ya existe nip_hash), nunca
--       el hash ni ningún otro dato. Se llama al perder el foco en
--       "código" o "nombre" en /ingreso/estudiante, para saber si esta
--       persona está creando su NIP por primera vez.
--     - El campo "Confirma tu NIP" solo aparece cuando esa función
--       responde que todavía no hay NIP guardado — así no se le pide a un
--       estudiante que ya tiene cuenta que capture su NIP dos veces en
--       cada login, solo la primera vez. El botón "Entrar" se deshabilita
--       mientras los dos campos no coincidan.
--     - Mismo patrón en /ingreso/profesora, pero sin RPC: el campo
--       "Confirma tu contraseña" solo se muestra en modo "crear cuenta"
--       (ese estado ya se conoce en el cliente), con la misma validación
--       de que coincidan antes de permitir el envío.
--     - Verificado en vivo: con un estudiante sin NIP aparece el campo de
--       confirmación y el botón se deshabilita si no coinciden; con un
--       estudiante que ya tiene NIP no aparece y el login normal sigue
--       funcionando; en el registro de docente, contraseñas distintas
--       deshabilitan "Crear cuenta" con el mensaje de error visible.
--
-- 17. Auditoría de seguridad (hallazgos VP-A1/A2/B4/C1/C2, corregidos y con
--     regresión pgTAP en supabase/tests/rls_seguridad.sql):
--     - VP-C2: se eliminó la policy de UPDATE que traía "estudiantes" (un
--       estudiante autenticado podía reescribir nombre/grupo_id/activo de
--       su propia fila por API directa, sin pasar por ninguna función).
--       Hoy "estudiantes" solo tiene SELECT propio + ALL para la docente
--       dueña del grupo.
--     - VP-C1: "entregas" sigue con su policy ALL de estudiante (RLS no
--       puede restringir columnas), pero ahora un trigger BEFORE UPDATE
--       (trg_proteger_entrega → proteger_columnas_entrega()) bloquea que el
--       estudiante cambie evaluacion_docente, estudiante_id o actividad_id
--       de su propia entrega; la docente dueña del grupo del estudiante
--       queda exenta.
--     - VP-B4: mismo patrón para docentes.correo (trg_proteger_correo_docente
--       → proteger_correo_docente()) — el correo se sincroniza solo desde
--       auth.users al crear el perfil, no se puede editar por API directa.
--     - VP-A1/VP-A2: ingresar_estudiante() y crear_perfil_docente() ya no
--       confiaban solo en un pg_sleep del lado del cliente contra fuerza
--       bruta. Ahora:
--       - estudiantes.intentos_fallidos (int, default 0) y
--         estudiantes.bloqueado_hasta (timestamptz, nullable) — se
--         incrementa/fija en ingresar_estudiante() tras un NIP incorrecto;
--         5 intentos seguidos bloquean 15 minutos.
--       - tabla intentos_codigo_invitacion (usuario_id uuid primary key,
--         intentos int default 0, bloqueado_hasta timestamptz) — mismo
--         mecanismo para crear_perfil_docente(), keyed por usuario_id
--         porque ahí todavía no existe una fila en "docentes" al momento
--         del intento.
--       - Importante: "NIP incorrecto" y "ya bloqueado" ya NO se señalan
--         con `raise exception` — un exception deshace TODO lo hecho antes
--         en esa misma llamada (incluido el incremento del contador), así
--         que el contador nunca se habría guardado. Ambas funciones ahora
--         devuelven el error como un valor más en su resultado (columna
--         `error` en ingresar_estudiante, texto de retorno en
--         crear_perfil_docente); el frontend lee ese valor en vez de
--         depender de un error de PostgREST.
--     - NIP inicial sembrado desde la boleta: agregar_estudiantes_con_boleta
--       (p_grupo_id, p_estudiantes jsonb) reemplaza el alta manual — valida
--       que la boleta tenga ≥4 dígitos y guarda nip_hash desde ya (últimos 4
--       dígitos), cerrando la ventana en la que cualquiera que supiera el
--       nombre de un estudiante nuevo podía registrarle un NIP antes que él.
--       Nueva columna estudiantes.boleta (text, nullable). Como estos
--       estudiantes ya tienen nip_hash desde el alta, el flujo de "confirma
--       tu NIP" del punto 16 no les aplica en su primer ingreso — solo a
--       estudiantes dados de alta sin boleta.
--     - PRNG criptográfico (crypto.getRandomValues) para el código de
--       acceso de grupo en vez de Math.random.
--     - Mensajes de error de Postgres/PostgREST ya no se muestran crudos en
--       el frontend (src/lib/mensaje-error.ts) — mapea `.code` a mensajes
--       en español o cae a uno genérico, para no filtrar nombres de
--       tabla/columna/constraint.
--     - Cabeceras de seguridad HTTP (CSP, X-Frame-Options, HSTS, etc.) en
--       next.config.ts — no afecta a la base de datos, solo al frontend.
--     - Verificado en vivo contra la base real (no solo por el mensaje del
--       commit): ambos triggers existen y funcionan, el backfill de
--       entregas con estado equivocado (ver punto 18) no dejó ninguna fila
--       atascada, y la suite pgTAP corre en una transacción con rollback
--       sin dejar datos de prueba.
--
-- 18. Revisión de calidad e integridad tras la auditoría de seguridad:
--     - comparador, opcion_justificacion y grabacion_rubrica marcaban sus
--       entregas 'completada' en vez de 'pendiente_revision' como los demás
--       tipos abiertos, por lo que nunca llegaban a la cola de revisión de
--       la docente. Corregido para entregas nuevas, con backfill de las ya
--       afectadas (confirmado: cero filas de estos 3 tipos quedaron con
--       estado='completada' y evaluacion_docente nulo).
--     - clasificacion/etiquetado_texto: respuesta.itemsSnapshot guarda una
--       copia de texto+respuesta correcta al momento de entregar, para que
--       la matriz de confusión del dashboard de grupo no se desalinee si la
--       docente edita la actividad después. Entregas anteriores sin
--       snapshot usan el contenido actual como respaldo.
--     - clasificacion/etiquetado_texto ya no se pueden reenviar corregidas
--       tras ser revisadas (antes se podía ver la respuesta correcta y
--       sacar 100% en un segundo intento).
--     - Se reintentó loading.tsx (esqueleto de carga) en las rutas del hub
--       y en actividad/[id] — el punto 13 de este changelog documentaba un
--       intento anterior revertido por sospecha de colgar el redirect a
--       /ingreso/estudiante. Esta vez, verificado en vivo por partida doble
--       (por quien lo implementó y, por separado, releído y re-probado 3
--       veces en un servidor de desarrollo limpio: dos rutas del hub y una
--       de actividad, sin sesión, siempre redirigieron correctamente sin
--       quedarse pegadas en el esqueleto) — se mantiene esta vez.
--     - middleware.ts se renombró a proxy.ts (convención de Next.js 16);
--       mismo comportamiento, sin cambios de base de datos.
--
-- 19. Cambiar mi NIP (estudiante, ya logueado):
--     - El NIP inicial de un estudiante dado de alta con boleta (punto 17)
--       ya no es un secreto inventado por él — son los últimos 4 dígitos de
--       su boleta, un dato que un compañero de salón puede conocer. Antes
--       no había forma de que el estudiante lo cambiara por su cuenta: solo
--       existía reiniciar_nip_estudiante(), que dispara la docente.
--     - función cambiar_nip_estudiante(p_nip_actual, p_nip_nuevo) —
--       SECURITY DEFINER, ubica al estudiante por auth.uid() (no recibe su
--       id, evita que alguien intente pasar el de otro). Exige el NIP
--       actual aunque ya haya sesión abierta — si alguien deja el equipo
--       sin cerrar sesión, un tercero no puede cambiar el NIP sin saberlo.
--     - Reutiliza estudiantes.intentos_fallidos/bloqueado_hasta (mismas
--       columnas y mismo umbral que ingresar_estudiante: 5 intentos, 15
--       minutos) para que esta puerta no sirva de atajo para adivinar el
--       NIP sin el bloqueo que ya protege el login. "NIP actual incorrecto"
--       se devuelve como texto, no como excepción, por la misma razón que
--       en ingresar_estudiante (una excepción deshace el incremento del
--       contador hecho en la misma llamada).
--     - src/components/cambiar-nip.tsx: enlace discreto en /estudiante/inicio
--       junto a "Salir"; al expandirse pide NIP actual + NIP nuevo +
--       confirmar NIP nuevo (mismo patrón de doble captura que crear un NIP
--       por primera vez, punto 16).
--     - Pruebas agregadas a supabase/tests/rls_seguridad.sql (rechaza NIP
--       actual incorrecto, acepta y cambia con el NIP correcto, verifica el
--       hash resultante) — corridas contra la base real antes de este
--       commit, las 11 pruebas del archivo pasan.
--
-- 20. Cambio de NIP obligatorio en el primer ingreso sembrado desde boleta:
--     - El punto 19 dejaba el cambio de NIP como algo opcional que el
--       estudiante tenía que saber que existía. A pedido del usuario: si su
--       NIP inicial es un dato conocible (la boleta), que se le obligue a
--       cambiarlo antes de usar el resto de la plataforma, no que se le
--       sugiera.
--     - columna estudiantes.debe_cambiar_nip boolean not null default
--       false. agregar_estudiantes_con_boleta() la pone en true al dar de
--       alta (el NIP sembrado no lo eligió el estudiante); alta manual
--       (sin boleta, el estudiante inventa su propio NIP) no la toca, se
--       queda en false.
--     - cambiar_nip_estudiante() la apaga al cambiar exitosamente.
--       reiniciar_nip_estudiante() también la apaga: tras un reinicio, lo
--       que sea que el estudiante capture en su siguiente ingreso lo elige
--       él mismo (flujo de "primera vez" del punto 16), ya no es el valor
--       sembrado desde la boleta.
--     - src/app/estudiante/(hub)/layout.tsx ahora es async y consulta
--       debe_cambiar_nip antes de renderizar cualquier página del hub
--       (inicio, calendario, progreso, portafolio, insignias, unidad/[id]):
--       si es true, renderiza CambiarNipObligatorio en vez de la página
--       pedida — pantalla completa, sin botón de "cancelar" ni "más tarde".
--       No cubre /estudiante/actividad/[id] (fuera del route group a
--       propósito, pantalla completa sin distracciones) — un estudiante no
--       puede llegar ahí sin pasar antes por /estudiante/inicio en su
--       primer ingreso, que sí está cubierto.
--     - src/components/ui/campo-nip.tsx: el input de NIP con mostrar/ocultar
--       se extrajo de cambiar-nip.tsx (punto 19) para reusarlo aquí sin
--       duplicar el componente completo.
--     - 4 pruebas nuevas en rls_seguridad.sql (agregar_estudiantes_con_boleta
--       marca la bandera, cambiar_nip la apaga, reiniciar_nip la apaga) —
--       corridas contra la base real, las 15 pruebas del archivo pasan.
--
-- 21. Ronda de facilidad para la docente (análisis "qué le falta a la
--     maestra para subir datos" compartido con el usuario):
--     - duplicar-actividad.tsx: botón de copiar en cada tarjeta de
--       actividad de docente/unidades/[id] — clona tipo/título/
--       instrucciones/contenido con "(copia)" en el título y abre directo
--       en modo edición. Evita reescribir una actividad casi idéntica
--       desde cero.
--     - "Revisar" en "Entregas por revisar" (docente/grupos/[id]) ahora
--       enlaza con ancla (#entrega-<id>) directo a la tarjeta de esa
--       entrega en la ficha del estudiante, en vez de al tope de la ficha
--       — la tarjeta se resalta con :target (ver Card en
--       docente/estudiantes/[id]/page.tsx). La lista también se ordena
--       por más antigua primero (antes salía en el orden arbitrario de
--       Postgres).
--     - editar-estudiante.tsx: permite corregir nombre/boleta de un
--       estudiante ya dado de alta. Antes, un error de dedo (o un cambio
--       real de boleta) no tenía arreglo salvo eliminar al estudiante
--       completo, perdiendo su historial. Corregir la boleta no toca el
--       nip_hash ya guardado.
--     - editar-grupo.tsx: permite corregir el nombre y el código de
--       acceso de un grupo después de creado (antes el código se generaba
--       una sola vez a partir del nombre, sin forma de editarlo). Avisa
--       que cambiar el código solo afecta a quien todavía no haya entrado
--       por primera vez.
--     - Se descubrió (no se creó — ya existía sin documentar) que
--       estudiantes tiene protección real contra duplicados:
--       estudiantes_nombre_unico_por_grupo (grupo_id, lower(trim(nombre)))
--       y estudiantes_boleta_unica_por_grupo (grupo_id, boleta) where
--       boleta is not null. Esto es lo que hace real el manejo de
--       "duplicate key" que ya tenía agregar-estudiantes.tsx — si la
--       docente pega el mismo roster dos veces, la segunda inserción falla
--       con un mensaje amigable en vez de crear estudiantes repetidos.
--       Verificado en vivo insertando un nombre repetido con mayúsculas
--       distintas ("estudiante prueba uno" vs "Estudiante Prueba Uno"):
--       la restricción de nombre lo bloqueó correctamente.
--     - Verificado en vivo con una cuenta de docente de prueba (correo
--       digp.esc+docente-prueba@gmail.com, "Grupo de Prueba" con 2
--       estudiantes — no es una cuenta real, existe solo para probar
--       flujos de docente sin usar la cuenta real): duplicar actividad, el
--       ancla+resaltado de "Revisar", y editar nombre de estudiante/grupo,
--       los tres funcionando correctamente end-to-end.
--
-- 22. Dos bugs reales encontrados haciendo el mismo recorrido desde la
--     vista del estudiante (con la cuenta de prueba), ninguno hipotético:
--
--     a) loading.tsx dejaba TODAS las páginas del hub del estudiante en
--        blanco (solo la barra inferior visible) al llegar por navegación
--        directa/recarga completa — no solo estando desconectado, que es
--        lo único que se había probado antes (ver puntos 13 y 18: esa
--        verificación cubría el caso de sesión inválida redirigiendo, no
--        este). El servidor sí mandaba el HTML completo y correcto (se
--        confirmó haciendo fetch() del HTML crudo), pero al hidratar en el
--        cliente el contenido real del segmento se quedaba sin insertarse
--        en el DOM visible — se reprodujo igual en producción real
--        (next build && next start), no solo en next dev. Se eliminaron
--        los 7 archivos loading.tsx del lado del estudiante (inicio,
--        calendario, progreso, portafolio, insignias, unidad/[id],
--        actividad/[id]) y el componente Skeleton que ya no se usa en
--        ningún lado. Verificado en vivo, en next dev y en next start,
--        navegando con recarga completa a las 7 rutas: las 7 renderizan
--        su contenido real sin quedarse en blanco.
--
--     b) /ingreso/estudiante reusaba CUALQUIER sesión ya activa en el
--        navegador con tal de que existiera, sin comprobar que fuera una
--        sesión anónima de estudiante. Si en ese navegador quedaba abierta
--        la sesión real de una docente (p. ej. una demo en un equipo
--        compartido sin cerrar sesión), un estudiante que entrara ahí
--        quedaba con estudiantes.auth_user_id apuntando a la cuenta de la
--        docente en vez de una identidad propia — heredando en silencio
--        sus permisos de RLS (se confirmó viendo entregas de otro
--        estudiante del grupo en el portafolio, algo que nunca debería
--        pasar). Ahora se comprueba auth.getUser().data.user.is_anonymous
--        antes de reusar la sesión; si hay una sesión pero no es anónima,
--        se cierra esa sesión primero y se crea una anónima nueva antes de
--        llamar a ingresar_estudiante(). Verificado en vivo reproduciendo
--        el escenario exacto (login como docente de prueba sin cerrar
--        sesión, luego login como estudiante en el mismo navegador): la
--        nueva sesión queda anónima y separada, y el portafolio ya no
--        muestra entregas de otro estudiante.
--
-- 23. Nombre de estudiante normalizado (mayúsculas, sin acentos) + rediseño
--     de "Agregar estudiantes" como tabla tipo Excel (a pedido del usuario):
--     - extensión unaccent habilitada. Nueva función
--       normalizar_nombre(text) — upper(trim(unaccent(...))), colapsando
--       espacios de más — es el criterio único de nombre de estudiante en
--       toda la plataforma: cómo se guarda al darlo de alta y cómo se
--       compara al entrar.
--     - agregar_estudiantes_con_boleta() guarda el nombre ya normalizado
--       (antes solo hacía trim). ingresar_estudiante() ahora compara
--       normalizar_nombre(nombre guardado) = normalizar_nombre(nombre que
--       escribe el estudiante) — antes solo ignoraba mayúsculas/minúsculas,
--       no acentos, así que un estudiante que omitiera un acento al
--       escribir su nombre (frecuente desde celular) no podía entrar
--       aunque el nombre fuera correcto.
--     - Se normalizaron con un UPDATE los nombres de estudiantes ya
--       existentes, para que la docente vea el mismo criterio en toda su
--       lista, no solo en las altas nuevas. Sin colisiones (se revisó
--       antes que no hubiera dos estudiantes en el mismo grupo cuyo nombre
--       normalizado coincidiera).
--     - src/lib/normalizar-nombre.ts: misma normalización en el cliente
--       (mismo truco NFD + rango de diacríticos que ya usaba
--       codigo-acceso.ts), para que la docente vea en la tabla exactamente
--       lo que se va a guardar antes de enviar — no solo al llegar al
--       servidor. Se aplica también en editar-estudiante.tsx (punto 21) al
--       corregir un nombre después del alta.
--     - agregar-estudiantes.tsx: la lista de filas editables (antes
--       tarjetas apiladas) se rediseñó como una tabla real con encabezados
--       "NOMBRE" / "BOLETA", más parecida a pegar en Excel — a pedido
--       explícito del usuario ("no me gusta [la lista por filas], que sea
--       tal cual como un Excel").
--     - Detección de "ya existe en el grupo": ahora compara cada fila
--       pegada contra los estudiantes que ya tiene el grupo (activos e
--       inactivos — el índice único no distingue por activo) y contra
--       filas repetidas dentro del mismo pegado, marcándolas aparte y
--       excluyéndolas del envío en vez de bloquear todo el lote. Antes,
--       si la docente volvía a pegar el roster completo actualizado (en
--       vez de aislar solo los nombres nuevos — el caso más natural),
--       la inserción entera fallaba por los nombres que ya existían, sin
--       decir cuáles. Ahora solo se envían las filas genuinamente nuevas.
--     - 2 pruebas nuevas en rls_seguridad.sql (normalizar_nombre quita
--       acentos y mayúsculas; ingresar_estudiante empareja un nombre
--       guardado sin acento contra uno escrito con acento) — corridas
--       contra la base real, las 17 pruebas del archivo pasan.
--     - Verificado en vivo con la cuenta de prueba: pegar un roster con
--       un nombre ya existente (distinto acento/mayúsculas) + un nombre
--       repetido dos veces en el mismo pegado + un nombre nuevo mostró
--       "2 ya existen (se omitirán) · 1 nueva" correctamente, y al enviar
--       solo se agregó el nuevo. Un estudiante entrando con su nombre en
--       minúsculas y con acento emparejó correctamente contra el nombre
--       guardado en mayúsculas sin acento.
--
-- 24. "Agregar estudiantes" como tabla directa (sin cuadro de texto
--     intermedio) + ronda de rendimiento tras reportar el usuario que
--     sentía tardanza al cargar y cambiar de pantalla:
--     - agregar-estudiantes.tsx: se quitó el textarea + botón "Pasar a la
--       tabla" (aclaración del usuario: el rechazo era al botón "Agregar
--       fila" que metía una fila en blanco directo en la tabla, no a poder
--       escribir a mano — pero el resultado pedido es una tabla tipo Excel
--       de entrada, no un paso intermedio). Ahora la tabla siempre tiene
--       una fila vacía al final (se agrega sola en cuanto la última deja
--       de estar vacía) y cada celda tiene onPaste propio: pegar un bloque
--       de Excel (o solo una columna) en cualquier celda reparte filas y
--       columnas a partir de ahí, extendiendo la tabla si hace falta.
--       Verificado en vivo pegando 3 filas de un jalón y escribiendo a
--       mano una cuarta.
--     - Páginas del docente reestructuradas para que ninguna consulta
--       espere a otra sin necesidad — RLS ya protege cada tabla por
--       docente_id, así que auth.getUser() no necesita resolver antes de
--       lanzar el resto: grupos/[id]/page.tsx pasó de hasta 4 viajes de
--       ida y vuelta seguidos a Supabase a 1 solo (incluida "entregas",
--       que antes esperaba conocer los ids de estudiantes de una consulta
--       previa — ahora filtra con un join embebido,
--       estudiantes!inner(grupo_id)); estudiantes/[id]/page.tsx de 3 a 1
--       (mismo truco para "comentarios" vía entregas!inner(estudiante_id));
--       unidades/[id]/page.tsx y la de editar actividad, de 3 y 2 a 1.
--     - src/lib/requerir-estudiante.ts (usado por las 5 páginas del hub
--       del estudiante): se quitó la llamada a auth.getUser() — la
--       política RLS de estudiantes ya solo deja ver la fila cuyo
--       auth_user_id = auth.uid() (columna unique), así que sin sesión (o
--       con sesión de otro tipo) la consulta ya vuelve vacía sola. De 2
--       viajes a 1 en cada una de las 5 páginas.
--     - inicio/page.tsx (estudiante): avisos y eventosProximos, que solo
--       dependen de estudiante.grupo_id (ya conocido), se movieron al
--       primer Promise.all — solo bitacoraActiva sigue aparte porque
--       depende de unidadActiva, calculada de unidades+entregas. De 4
--       viajes seguidos (auth + estudiante + lote1 + lote2) a 3.
--     - Verificado en vivo cada página tocada con datos reales (se
--       insertó y luego se retiró una entrega y un comentario de prueba
--       para probar los joins embebidos, que eran un patrón nuevo en este
--       proyecto) — sin regresiones. Medido con Resource Timing en este
--       entorno: grupos/[id] bajó de ~1.65s a ~0.9-1.1s en navegación ya
--       compilada; el resto del tiempo es overhead propio de `next dev` +
--       latencia de red hacia Supabase desde este entorno, no
--       necesariamente lo que sienta un usuario real en producción.
--     - Índices nuevos: avisos(grupo_id), eventos(grupo_id),
--       retroalimentacion_docente(entrega_id),
--       retroalimentacion_docente(docente_id) — las dos primeras se
--       consultan por grupo_id en varias pantallas (grupo del docente,
--       inicio y calendario del estudiante) sin índice; las de
--       retroalimentacion_docente respaldan el nuevo join embebido y su
--       propia política RLS (docente_id = auth.uid()).
--     - get_advisors (performance) del proyecto real señaló además 13
--       llaves foráneas sin índice de cobertura (actividades.tipo_id,
--       actividades.unidad_id, autoevaluaciones_confianza.unidad_id,
--       avisos.docente_id, avisos.unidad_id, bitacora.unidad_id,
--       entregas.actividad_id, eventos.docente_id, eventos.unidad_id,
--       grupos.docente_id, insignias_otorgadas.insignia_id,
--       reflexiones.actividad_id, reflexiones.unidad_id) — se agregaron
--       los 13 índices, mismo tipo de cambio puramente aditivo que los de
--       arriba.
--     - PENDIENTE, sin tocar todavía: el mismo advisor marca ~19
--       políticas RLS que llaman auth.uid() sin envolver en
--       (select auth.uid()) — Postgres las reevalúa por cada fila en vez
--       de una sola vez por consulta (patrón documentado por Supabase).
--       Es mecánico y no cambia qué filas ve cada quien, pero toca todas
--       las políticas de seguridad de una base con datos reales de
--       estudiantes, así que se dejó pendiente de decisión explícita del
--       usuario en vez de aplicarse solo. También señaló "Multiple
--       Permissive Policies" en casi todas las tablas (una política para
--       docente y otra para estudiante evaluándose ambas por fila) — es
--       el diseño intencional de tener narrativas de acceso separadas por
--       tipo de usuario, y fusionarlas complicaría leer la política a
--       cambio de una ganancia que solo importa a mucha mayor escala; no
--       se recomienda tocarlo.
--
-- 25. El pendiente del punto 24 (auth.uid() sin envolver en las políticas
--     RLS) se resolvió: el usuario autorizó explícitamente aplicarlo. Las
--     20 políticas que el advisor señaló se reescribieron con
--     ALTER POLICY ... USING (...), envolviendo cada auth.uid()/auth.role()/
--     auth.jwt() en (select ...) — mismo resultado, evaluado una vez por
--     consulta en vez de una vez por fila. Incluyó una política que existía
--     en la base real pero nunca se documentó aquí ("docente actualiza
--     estado de entregas de sus grupos", en entregas) — se aprovechó para
--     cerrar ese gap también. Verificado con una consulta a pg_policies
--     que las 20 quedaron envueltas (0 sin envolver) y, en vivo, que el
--     dashboard/grupo/ficha de estudiante de la docente siguen mostrando
--     exactamente los mismos datos que antes de tocar las políticas.
--
-- 26. Motor de rondas para opcion_justificacion (a pedido de la maestra:
--     "más ejercicios"/"segundo nivel de dificultad" en varias actividades,
--     y un simulador narrado para "el circuito de la comunicación"):
--     - contenido pasa de {pregunta, opciones, ideas_clave} a
--       {intro?, rondas: [{contexto?, pregunta, opciones, ideas_clave?}]}.
--       Las actividades ya existentes con la forma plana se siguen leyendo
--       sin migración — src/lib/opcion-justificacion.ts detecta ambas
--       formas (rondasDeContenido/introDeContenido/rondasDeRespuesta). Todo
--       lo nuevo se guarda siempre como {rondas:[...]}, incluso con una
--       sola pregunta — una actividad vieja se "normaliza sola" la próxima
--       vez que se edite y guarde en actividad-form.tsx.
--     - opcion-justificacion.tsx (estudiante) ahora es un wizard: barra de
--       progreso + "Pregunta N de M" cuando hay más de una ronda (nada si
--       hay una sola, para no cambiar la experiencia de las actividades
--       existentes), "Siguiente" valida antes de avanzar, la última ronda
--       guarda todo el arreglo en una sola entrega (entregas ya tiene
--       unique(estudiante_id, actividad_id), así que no se puede partir en
--       varias filas). Sigue sin bloquear tras guardar. puntaje_auto sigue
--       en null — no hay calificación automática de este tipo, esto es
--       organización, no un mecanismo de calificación nuevo.
--     - Nuevo: tras guardar, se revela cuáles de las ideas_clave mencionó
--       en su justificación (antes solo se veía el conteo mientras
--       escribía, nunca cuáles eran).
--     - actividad-form.tsx: el editor de opcion_justificacion pasa de 3
--       campos a una lista de "preguntas" repetibles (agregar/quitar/
--       reordenar con flechas, no arrastrar — mismo criterio de
--       accesibilidad del punto 45 del changelog visual) más un campo de
--       introducción general opcional.
--     - resumen-respuesta.ts y la ficha de estudiante de la docente
--       muestran el desglose por ronda cuando hay más de una, sin romper
--       las entregas viejas ya calificadas/comentadas (mismo helper
--       rondasDeRespuesta detecta la forma).
--     - clasificacion/etiquetado_texto NO reciben este concepto de rondas:
--       ya soportan N elementos por ronda (agregar filas alcanza para "más
--       ejercicios del mismo párrafo") y tienen un modelo de confianza
--       distinto (auto-calificadas y bloqueadas tras el primer envío) —
--       "segundo nivel con otro párrafo" ahí sigue siendo actividad
--       hermana nueva.
--     - Verificado en vivo: actividad nueva de 2 rondas (con contexto
--       narrativo e ideas_clave) creada, completada como estudiante
--       (incluida navegación Atrás/Siguiente y el revelado post-envío),
--       revisada en la ficha del docente con el desglose por ronda
--       correcto — y una actividad vieja de forma plana ("Niveles de la
--       lengua") verificada sin cambios visibles ni de comportamiento
--       tanto en el editor como del lado del estudiante. Datos de prueba
--       limpiados después.
--
-- 27. Unidad de Competencia (UC) y Aprendizaje Esperado (AE), a pedido de
--     la maestra (punto 1 de sus observaciones, texto exacto tomado del
--     Programa Sintético del programa de estudios oficial):
--     - unidades.unidad_competencia (text) — una por unidad, se muestra
--       una sola vez por unidad (banner en unidad/[id]/page.tsx) y también
--       como contexto en cada página de actividad de esa unidad. Backfill
--       de las 3 unidades ya hecho.
--     - actividades.aprendizaje_esperado (text, nullable) — específico por
--       actividad, se muestra solo en esa actividad. Editable desde
--       actividad-form.tsx (campo nuevo, junto a instrucciones). Backfill
--       hecho para las 10 actividades de Unidad 1 que van a seguir
--       existiendo tras la Fase E (mapeado 1:1 con los 3 AE de la unidad
--       según los "saberes" que describe cada uno en el programa) — U2 y
--       U3 quedan pendientes hasta que se termine de definir su contenido
--       final (Fases F y G).
--     - bitacora.tsx (estudiante, "mi meta de la unidad"): se retiró la
--       pregunta abierta "¿Cuál es tu meta para esta unidad?" — una meta
--       libre invitaba a respuestas vagas tipo "esforzarme más". Se
--       reemplazó por 3 campos guiados, Verbo / Qué / Cómo, que se
--       concatenan en una sola oración al guardar (sigue siendo la misma
--       columna bitacora.meta text, sin cambio de esquema ahí) — mismo
--       texto guardado se sigue mostrando igual que antes al reabrir.
--     - Verificado en vivo: banner de UC visible en unidad y actividad,
--       AE visible en la actividad correspondiente, formulario de meta
--       guarda y compone la oración correctamente, campo de AE en el
--       editor de la docente carga y persiste. Datos de prueba limpiados.
--
-- 28. Reflexión y confianza por actividad, punto 2 de las observaciones de
--     la maestra:
--     - reflexiones.texto pasó a nullable (antes not null) — prediccion.tsx
--       ya no pregunta "¿qué crees que se te va a dificultar más de esta
--       actividad?" (invitaba a sugestionarse con algo difícil antes de
--       empezar); ahora guarda texto = null y solo la escala de confianza,
--       reformulada en positivo ("¿Qué tan seguro te sientes de que esta
--       actividad te va a salir bien?", etiquetas "Poco seguro"/"Muy
--       seguro"). reflexion.tsx no necesitó ningún cambio: su callback
--       "Dijiste que te costaría..." y el encabezado "¿qué tan cierta fue
--       tu predicción?" ya estaban condicionados a que prediccionTexto
--       exista — con las prediciones nuevas guardando null, cae solo en el
--       encabezado genérico ("¿qué fue lo más difícil de este ejercicio?")
--       sin mostrar el callback, y las predicciones viejas que ya tenían
--       texto lo siguen mostrando igual que antes.
--     - confianza.tsx (nivel unidad) — el gate por 100% de avance para la
--       versión "cierre" ya existía tal cual lo pedía la maestra; se
--       cambió el texto para referenciar la unidad de competencia
--       ("¿qué tan seguro te sientes de alcanzar la unidad de
--       competencia?") y se le pasa unidad_competencia como contexto
--       visible, igual que en bitacora.tsx.
--     - Verificado en vivo: actividad completa de punta a punta (predicción
--       sin texto → actividad → cierre) muestra la calibración de
--       confianza correctamente ("Te sentías poco seguro... y acertaste
--       100%...") sin el callback de predicción. Datos de prueba limpiados.
--
-- 29. Video por actividad y freno anti copy-paste (puntos 3 y 7):
--     - actividades.video_url (text, nullable). src/lib/video-embed.ts
--       detecta youtube.com/watch, youtu.be y youtube.com/embed y arma la
--       URL de embed; cualquier otro dominio se muestra como link "Ver
--       video" en vez de intentar embeberlo a ciegas. Sin video_url no se
--       muestra nada (nada de placeholder "próximamente"). Campo nuevo en
--       actividad-form.tsx. Sin contenido todavía — la maestra no tiene
--       los videos aún; la infraestructura queda lista para cuando los
--       tenga.
--     - src/lib/anti-copiar.ts: dos handlers mínimos, bloquearPegado (para
--       los inputs de respuesta libre) y bloquearCopiar (para los bloques
--       de texto fuente que la actividad le da al estudiante). Aplicado en
--       las 6 actividades de respuesta abierta (opcion_justificacion,
--       encontrar_corregir, comparador, redaccion_checklist,
--       constructor_ramificado, grabacion_rubrica) — bloquea pegar
--       contenido externo/de un chatbot en la respuesta propia, y bloquea
--       copiar + user-select + clic derecho en los bloques de texto fuente
--       de encontrar_corregir y redaccion_checklist. Es un freno, no una
--       barrera real — no detiene devtools ni una captura de pantalla; no
--       toca la tabla de pegado de Excel de la maestra en
--       agregar-estudiantes.tsx, que es una parte completamente distinta
--       de la app.
--     - Verificado en vivo: iframe de YouTube embebido correctamente para
--       un link real (uno de los videos del programa oficial), pegar en la
--       respuesta bloqueado (el textarea queda vacío), copiar+user-select
--       bloqueado en el texto fuente. Datos de prueba limpiados.
--
-- 30. Fase E — Unidad 1 completa (puntos 1, 5, 6, 8, 9, 10, 11, 12, 13, 14,
--     15 de las observaciones de la maestra). Cambios de código primero,
--     contenido (directo en la base real vía SQL) después:
--     - clasificacion.tsx ganó un campo contexto opcional (mismo patrón que
--       ya tenía etiquetado_texto) — antes no había forma de mostrarle al
--       estudiante el párrafo del que salen los elementos a clasificar, que
--       es justo lo que la maestra señaló que faltaba en "Ideas principal,
--       secundaria y terciaria". Con protección anti-copiar igual que el
--       resto. Campo nuevo correspondiente en actividad-form.tsx.
--     - redaccion_checklist ganó titulo_fuente (separa el título del
--       cuerpo del texto fuente) y ejemplos_resueltos (bloque opcional,
--       detrás de un botón "Ver ejemplos ya resueltos", pensado para
--       mostrar resumen/síntesis/paráfrasis del mismo texto como
--       referencia antes de escribir).
--     - Contenido, actividad por actividad:
--       - "El circuito de la comunicación": la maestra pidió reemplazarla
--         por un simulador — la actividad clasificacion original ya tenía
--         5 entregas reales de estudiantes; se le preguntó explícitamente
--         al usuario si reemplazar de verdad (perdiendo esas 5 entregas) o
--         agregar el simulador aparte, y se confirmó reemplazar. Ahora es
--         opcion_justificacion con 7 rondas narrando una conversación real
--         por WhatsApp entre dos estudiantes (Ana y Luis) donde cada paso
--         identifica un elemento del circuito.
--       - Contextos normativos de la lengua: nota agregada aclarando que
--         "normal" = pertinente al contexto comunicativo.
--       - Registros lingüísticos: categorías rehechas de la rejilla
--         culto/inculto × formal/informal a un solo eje de 3: Culto /
--         Inculto / Vulgar (el vulgar usa "haiga", vulgarismo gramatical
--         clásico, en vez de groserías explícitas).
--       - Niveles de la lengua: de 1 pregunta a 3 rondas (coloquial,
--         técnico-científico, literario).
--       - Tipologías textuales: se quitó la pregunta redundante al final
--         del fragmento, "predomina"→"caracteriza", de 1 pregunta a 4
--         rondas (narración, exposición, argumentación, descripción,
--         mezcladas fuera de ese orden) con textos sobre aprendizaje
--         autónomo/autorregulación.
--       - Variaciones y deformaciones de la lengua: renombrada (antes
--         "Deformaciones y variaciones..."), instrucción reescrita.
--       - Las 6 funciones de la lengua: "predomina"→"caracteriza", de 6 a
--         12 elementos (el doble de práctica al mismo nivel). Actividad
--         hermana nueva "— nivel 2" con 6 mensajes más largos y ambiguos.
--       - Ideas principal, secundaria y terciaria: reconstruida con un
--         párrafo nuevo (contexto visible) — idea principal al final, 2
--         secundarias, una con 2 terciarias y otra con 1 terciaria — 6
--         oraciones a clasificar con extractos literales como opciones.
--         Hermana nueva "— nivel 2": otro párrafo, mismas 3 categorías,
--         pero las opciones son interpretaciones, no extractos literales.
--       - Coherencia global del texto: cambió de tipo (encontrar_corregir
--         → clasificacion) — ahora son 6 fragmentos sobre interculturalidad,
--         3 que juntos arman un mensaje coherente/cohesionado/adecuado a
--         contexto académico y 3 distractores no obvios (relacionados con
--         "cultura" pero que no encajan en el mismo argumento). Cubre
--         adecuación + coherencia + cohesión en un solo ejercicio.
--       - El resumen imposible: ya no menciona síntesis como alternativa
--         (solo resumen); título y cuerpo del texto fuente separados;
--         ejemplos ya resueltos de resumen/síntesis/paráfrasis del mismo
--         texto agregados como referencia. Actividad hermana nueva
--         "Practica tu resumen": texto breve distinto (sobre emojis),
--         clasificacion con categorías "Va en el resumen"/"No va en el
--         resumen" sobre sus 7 oraciones — auto-calificable a diferencia
--         del ejercicio de redacción libre.
--     - Orden final de Unidad 1 (13 actividades, antes 11): circuito
--       (simulador) → contextos normativos → registros → niveles →
--       tipologías → variaciones y deformaciones → funciones → funciones
--       nivel 2 → ideas ppal/sec/terc → ideas nivel 2 → coherencia global →
--       resumen → practica tu resumen.
--     - aprendizaje_esperado backfillado en las 3 actividades nuevas,
--       heredado de su actividad base (mismo AE, misma unidad de
--       competencia).
--     - Verificado en vivo de punta a punta: el simulador del circuito
--       (7 rondas, revisado también desde la ficha de la docente con el
--       desglose completo), y "Practica tu resumen" (contexto visible,
--       auto-calificación 100% correcta). Build y typecheck limpios.
--       Datos de prueba limpiados en cada caso, incluida la restauración
--       del NIP de las cuentas de prueba tras cada verificación.
--
-- 31. Fase F — Unidad 3 completa (puntos 4, 17, 18, 19, 20, 21 de las
--     observaciones de la maestra). Solo contenido (directo en la base real
--     vía SQL) — ningún archivo de código nuevo, las 3 actividades
--     rehechas reusan el motor de rondas de opcion_justificacion (Fase A) y
--     clasificacion tal cual ya existían:
--     - "Simulador de exposición oral" (grabacion_rubrica) eliminada — 0
--       entregas reales, sin necesidad de confirmación del usuario (a
--       diferencia del circuito de Fase E, que sí tenía entregas). El
--       simulador narrado del punto 4 ya había quedado cubierto en Fase A
--       con el nuevo "circuito de la comunicación" de Unidad 1.
--     - Cualidades objetivas y subjetivas: la clasificación estaba
--       invertida — corregida con las listas exactas de la maestra.
--       Renombrada "Cualidades internas y externas de la exposición oral".
--       15 elementos: 13 internos/subjetivos (autodominio, organización de
--       las ideas, proyección de las emociones, dicción, fluidez, ritmo,
--       coherencia, sencillez, claridad, concisión, volumen, tono y
--       modulación, movimientos corporales y gesticulación) + 2
--       externos/objetivos (conocimiento del público, empleo de la lengua
--       adecuada). El rediseño grande con videos del PIFI (correcto/con
--       errores) sigue bloqueado — la maestra no tiene los videos aún.
--     - Técnica ante un escenario (×2, "un solo compañero" y "todo el
--       grupo"): reconstruidas con el motor de rondas — antes usaban
--       opciones ad-hoc que no correspondían a técnicas reales de
--       exposición oral (ej. "lectura en voz alta", "apoyo visual"), ahora
--       las 4 opciones en ambas son siempre Exposición / Discurso / Debate
--       / Mesa redonda, con 2 rondas de contexto cada una: "un solo
--       compañero" cubre Exposición (explicar un tema perdido) y Discurso
--       (persuadir de unirse a un proyecto); "todo el grupo" cubre Debate
--       (celulares en examen) y Mesa redonda (IA en la escuela,
--       moderada).
--     - Exposición individual vs. en equipo (comparador): de 3 a 5
--       criterios — se agregaron "¿Cómo se reparte la responsabilidad?" y
--       "¿Qué tan fácil es prepararse con poco tiempo?". Sin cambio de
--       código (comparador.tsx no tiene forma de guardar respuestas
--       modelo, igual que el resto de comparadores existentes — no se le
--       agregó ese campo para no romper el patrón).
--     - Nueva actividad "Elementos no verbales de la exposición"
--       (clasificacion), insertada en orden 2 (entre cualidades y las
--       técnicas): 6 elementos sobre Kinésica / Proxémica / Paralingüística.
--     - Orden final de Unidad 3 (5 actividades, antes 5 con grabación en
--       vez de elementos no verbales): cualidades → elementos no verbales →
--       técnica (un compañero) → técnica (todo el grupo) → individual vs.
--       equipo.
--     - aprendizaje_esperado actualizado en las 5 actividades (AE1 para
--       cualidades y elementos no verbales, AE2 para las 3 restantes).
--     - Verificado en vivo de punta a punta: unidad completa (orden y UC/AE
--       correctos), las 15+6 opciones de clasificación renderizan bien, el
--       wizard de rondas funciona en ambas técnicas (incluido el revelado
--       de ideas_clave tras guardar), el desglose por ronda se ve
--       correctamente en la ficha de la docente, y el comparador muestra
--       los 5 criterios. Build y typecheck limpios. Datos de prueba
--       limpiados (entregas y reflexiones de prueba borradas; NIP de ambas
--       cuentas de prueba reiniciado — una vía la función
--       reiniciar_nip_estudiante desde la UI, la otra por SQL directo
--       replicando la misma función porque la sesión de la pestaña de
--       prueba se había invalidado a media verificación).
--
-- 32. Fase G — Unidad 2 reconstruida por completo hacia ortografía (punto
--     16 de las observaciones de la maestra). Solo contenido — ningún
--     archivo de código nuevo ni modificado; reusa etiquetado_texto,
--     clasificacion y el motor de rondas de opcion_justificacion tal cual
--     ya existían. Las 7 actividades tenían 0 entregas reales, así que se
--     reemplazaron directamente sin necesitar confirmación del usuario:
--     - "Uso del punto: seguido, aparte y final" (etiquetado_texto, mismo
--       tipo que ya tenía) — texto de 6 fragmentos sobre hábitos de
--       estudio sin puntos; el estudiante etiqueta cada uno como punto y
--       seguido / punto y aparte / punto final.
--     - "Uso de la coma" (constructor_ramificado → clasificacion) — 6
--       oraciones, 4 categorías (enumerativa, vocativa, explicativa, antes
--       de conector).
--     - "Punto y coma y dos puntos" (constructor_ramificado →
--       clasificacion) — 6 oraciones con un hueco marcado, 3 categorías
--       (punto y coma / dos puntos / ninguno, usa coma).
--     - "Letras que se confunden: B, V, S, C, Z, G, J, H"
--       (constructor_ramificado → clasificacion) — 8 palabras con hueco,
--       una por cada una de las 8 letras confusas como categoría.
--     - "Acentuación: agudas, graves, esdrújulas y sobresdrújulas"
--       (comparador → clasificacion) — 8 palabras, 4 categorías (2 de cada
--       una).
--     - "Signos de puntuación: uso y función" (constructor_ramificado →
--       clasificacion) — 6 situaciones descritas por su función (no por el
--       signo literal, para no regalar la respuesta), 5 categorías
--       (interrogación, exclamación, comillas, paréntesis, guion largo).
--     - "Identifica el modelo expositivo" (comparador → opcion_justificacion,
--       motor de rondas) — 4 rondas, cada una con un texto breve nuevo que
--       ejemplifica uno de los modelos ya vistos en la unidad anterior
--       (Causa-Efecto, Cronológico, Tesis-Antítesis-Síntesis,
--       Confrontación); así el contenido de modelos expositivos no se tira,
--       se conserva como repaso final en vez de ser el eje de toda la
--       unidad.
--     - unidades.descripcion y unidades.reto_comunicativo actualizados
--       (antes hablaban de "modelos expositivos"/"redactar un texto
--       expositivo", ahora de ortografía y puntuación) — se habían quedado
--       desalineados con el contenido nuevo.
--     - aprendizaje_esperado de las 7 actividades queda sin tocar (null,
--       igual que ya estaba): el plan aprobado marcó explícitamente que el
--       AE oficial de Unidad 2 describe comprensión lectora, no ortografía,
--       y que el remapeo se decide con la maestra — no se inventó texto de
--       AE para no comprometer contenido curricular sin su revisión.
--     - Verificado en vivo: las 7 actividades en orden correcto, el texto
--       nuevo del reto_comunicativo visible en inicio y en la unidad,
--       "Uso del punto" (etiquetado_texto) y "Letras que se confunden"
--       (clasificacion con 8 categorías, incluida una entrega completa con
--       100% de aciertos) renderizan y califican bien, el wizard de rondas
--       de "Identifica el modelo expositivo" funciona con las 4 preguntas.
--       El formulario de edición de la docente también se probó en las dos
--       actividades que cambiaron de tipo (clasificacion y
--       opcion_justificacion): carga el tipo nuevo, el contenido guardado y
--       la vista previa correctamente. Typecheck limpio (sin cambios de
--       código, no ameritó build completo). Datos de prueba limpiados y NIP
--       de la cuenta de prueba usada reiniciado al mismo estado base que
--       las demás.
--
-- 33. Reflexión pasa de ser por actividad a ser por unidad, y UC/AE ganan
--     etiquetas visibles — pedido explícito del usuario tras cerrar las
--     Fases A-G ("recuerda que hay una sola reflexión, una por unidad, se
--     da al inicio y al final; el de las actividades es de seguridad"):
--     - Antes: cada una de las 25 actividades pedía, al terminarla, una
--       reflexión abierta ("¿qué fue lo más difícil de este ejercicio?",
--       reflexion.tsx, momento='cierre', actividad_id set). El nivel de
--       unidad solo tenía confianza numérica (autoevaluaciones_confianza,
--       inicio/cierre) y la bitácora de meta (solo inicio). No había
--       ninguna reflexión abierta a nivel unidad.
--     - Ahora: reflexion.tsx se eliminó por completo. En su lugar,
--       calibracion-confianza.tsx (nuevo, sin estado ni guardado) muestra
--       automáticamente un mensaje de calibración confianza-vs-puntaje bajo
--       la actividad cuando ambos datos existen (solo aplica a los tipos
--       auto-calificados: clasificacion, etiquetado_texto) — sin pedir
--       nada, es puramente informativo ("seguridad", no "reflexión").
--       reflexion-cierre.tsx (nuevo, en unidad/[id]/) pide una reflexión
--       abierta real ("¿qué aprendiste? ¿lograste lo que dijiste en tu
--       bitácora?") una sola vez, cuando la unidad llega a 100% — hace
--       pareja con bitacora.tsx (que ya cubría el "inicio": "¿qué
--       aprendizaje esperas alcanzar?"). Reusa reflexiones.unidad_id, que
--       ya existía en el esquema (agregado en un changelog de índices
--       anterior) pero nunca se había usado — actividad_id queda null en
--       estas filas nuevas.
--     - Migración: nueva constraint reflexiones_unica_por_unidad UNIQUE
--       (estudiante_id, unidad_id, momento) — la constraint vieja
--       (estudiante_id, actividad_id, momento) no sirve para el upsert de
--       las filas nuevas porque actividad_id es null ahí (NULL≠NULL en un
--       UNIQUE de Postgres). Las dos constraints conviven sin pisarse:
--       cada fila solo hace match contra la que le corresponde según cuál
--       de las dos columnas trae valor.
--     - verificar_insignias() actualizado: 'Primera reflexión'/'Mente
--       reflexiva' ahora cuentan reflexiones con unidad_id not null (antes
--       contaban actividad_id). Con solo 3 unidades en todo el curso, el
--       máximo de reflexiones de cierre pasó de 25 a 3 — el umbral de
--       'Mente reflexiva' bajó de 5 a 3 (alcanzable: reflexionar al cerrar
--       las 3 unidades) y sus descripciones en insignias se actualizaron
--       para no mencionar "actividad"/"5".
--     - Efecto secundario aceptado, no corregido: DIEGO RAMIREZ (5) e ISMA
--       (1) ya tenían reflexiones de cierre viejas por actividad en
--       producción antes de este cambio — esas filas NO se borraron (no es
--       dato de prueba), pero portafolio y la ficha de la docente ya no
--       las muestran porque ahora buscan unidad_id not null en vez de
--       actividad_id not null. Es un cambio de visualización, no de datos.
--     - portafolio/page.tsx y docente/estudiantes/[id]/page.tsx
--       actualizados para consultar/mostrar la reflexión una vez por
--       unidad (antes: repetida bajo cada tarjeta de actividad completada).
--     - UC/AE sin etiqueta visible, punto aparte del mismo pedido ("que se
--       entienda que es una UC y un AE"): unidad_competencia se mostraba
--       como texto suelto sin ningún rótulo en las 4 pantallas donde
--       aparece (unidad/[id], actividad/[id], confianza.tsx, bitacora.tsx)
--       — un estudiante de 15 años no tenía forma de saber qué era esa
--       oración. Nuevo componente compartido
--       components/ui/unidad-competencia-tag.tsx con dos variantes: la
--       versión completa (solo en el banner de unidad/[id]) trae un
--       eyebrow "UNIDAD DE COMPETENCIA — LO QUE VAS A DOMINAR AL TERMINAR
--       ESTA UNIDAD"; la versión compacta (actividad/[id], confianza.tsx,
--       bitacora.tsx) solo antepone "Unidad de competencia: " en línea,
--       para no repetir la explicación completa cada vez que ya se vio una
--       vez en la unidad. El bloque de "Aprendizaje esperado" en
--       actividad/[id] recibió el mismo tratamiento de eyebrow explicativo
--       ("APRENDIZAJE ESPERADO — LO QUE ESTA ACTIVIDAD BUSCA QUE LOGRES"),
--       ya que ahí sí cambia de contenido en cada actividad.
--     - Verificado en vivo de punta a punta con las 5 actividades de
--       Unidad 3: el mensaje de calibración aparece correctamente después
--       de las auto-calificadas (13/15 y "bien calibrada") y NO aparece
--       después de las de opción-justificación/comparador (sin
--       puntaje_auto, como se esperaba); al completar la unidad aparecen
--       los dos gates de cierre (confianza + reflexión) junto a los
--       eyebrows de UC/AE ya legibles; se guardó la reflexión de cierre,
--       se confirmó el estado "Cambiar" de solo lectura, y se otorgaron
--       correctamente las insignias "Unidad 3 completa" y "Primera
--       reflexión" (verificar_insignias() sin errores). Portafolio y ficha
--       de la docente muestran la reflexión una sola vez, con el nombre de
--       la unidad en vez del título de una actividad. Typecheck y build
--       limpios. Datos de prueba limpiados; NIP de la cuenta de prueba
--       usada reiniciado al mismo estado base que las demás.
--
-- 34. Fase H — segunda ronda de observaciones tras revisar el sitio en
--     Netlify: bugs y copy (sin cambios de esquema):
--     - ingreso/estudiante/page.tsx: se eliminó el flujo de confirmación de
--       NIP embebido en el login (estado nipConfirmar, RPC
--       estudiante_tiene_nip, campo "Confirma tu NIP") que se activaba
--       cuando nip_hash era null — duplicaba y contradecía al único flujo
--       correcto que debe existir (cambiar-nip-obligatorio.tsx, mostrado
--       tras el primer login con NIP de boleta, que sí pide confirmar).
--       Ahora el login nunca pide confirmación bajo ninguna circunstancia;
--       la única confirmación de NIP en toda la app ocurre al reemplazar
--       el NIP de boleta por uno propio.
--     - Barrido de guiones largos (—) por paréntesis en ~20 cadenas
--       visibles al estudiante (mensajes de validación, HelpText, UC/AE).
--       Se dejaron sin tocar los usos de "—" como marcador de dato ausente
--       (ej. "Grupo {nombre ?? "—"}").
--     - bitacora.tsx: placeholder del verbo cambia a infinitivo
--       ("Identificar"), se agrega hint aclarando "-ar/-er/-ir"; se quitó
--       el botón "Cambiar" — una vez guardada la meta de la unidad, ya no
--       se puede editar.
--     - confianza.tsx: se quitó el UnidadCompetenciaTag (ya se muestra una
--       vez arriba en la página de unidad) y se cambió el botón de
--       "Continuar" a "Guardar".
--     - Redacción de la pregunta de confianza mejorada, tanto por
--       actividad (prediccion.tsx) como por unidad (confianza.tsx).
--     - actividad/[id]/page.tsx: cuando video_url es null, ahora se
--       muestra una caja placeholder ("Video próximamente") en vez de no
--       mostrar nada — reserva el espacio para cuando la maestra tenga los
--       videos.
--     - Verificado en vivo: login sin campo de confirmación en ningún
--       caso, primer login con NIP de boleta sigue pidiendo cambio+
--       confirmación correctamente, bitácora con hint de infinitivo y sin
--       botón de editar, confianza de unidad sin UC duplicada y con botón
--       "Guardar". Typecheck y build limpios. Estudiante de prueba
--       temporal creado y eliminado al terminar (la cuenta de revisión
--       real ya la había usado el usuario, no se tocó).
--
-- 35. Fase I — navegación y gating:
--     - Botón "Siguiente actividad" en actividad/[id]/page.tsx: consulta
--       liviana a las actividades hermanas de la unidad (id, orden) dentro
--       del Promise.all existente; tras completar, enlaza a la siguiente
--       por orden, o "Volver a la unidad" si era la última.
--     - Unidades secuenciales: unidad/[id]/page.tsx ahora verifica, para
--       unidad.orden > 1, que la unidad anterior esté 100% completa Y
--       tenga su reflexión de cierre guardada — si no, corta antes de
--       correr las consultas pesadas y muestra un EmptyState "Termina
--       primero la Unidad N-1" con link. Cálculo de "unidad completa"
--       extraído a src/lib/progreso-unidad.ts (unidadEstaCompleta),
--       reusado también en inicio/page.tsx para el cálculo de la unidad
--       activa (antes usaba pct<100, que en teoría podía desalinearse del
--       booleano real por redondeo — ahora ambos usan la misma función).
--     - Gating de nivel 2: nueva columna actividades.requiere_actividad_id
--       (uuid, nullable, references actividades) — más robusto que
--       comparar títulos "— nivel 2". Wireada por SQL a los 2 pares
--       existentes (Las 6 funciones de la lengua → su nivel 2; Ideas
--       principal/secundaria/terciaria → su nivel 2), ambos confirmados
--       por DB como tipo clasificacion (si el prerequisito tiene
--       puntaje_auto ≥ 70 se desbloquea, mismo umbral que ya usa
--       inicio/page.tsx para "para repasar"). Actividades bloqueadas se
--       muestran como card no clicable con candado y "Completa primero:
--       {título}" en la lista de la unidad; actividad/[id]/page.tsx
--       redirige del lado servidor a la unidad si alguien entra por URL
--       directa a una actividad bloqueada. Pendiente (no urgente): UI en
--       actividad-form.tsx para que la docente configure esto sin SQL —
--       se difirió para priorizar el resto de las fases.
--     - Verificado en vivo: Unidad 2 bloqueada correctamente antes de
--       terminar Unidad 1, ambas actividades "nivel 2" se ven con candado
--       desde el inicio, botón "Siguiente actividad" enlaza a la actividad
--       correcta por orden. Typecheck y build limpios. Datos de prueba
--       limpiados.
--
-- 36. Fase J — reflexión de seguridad por actividad (de vuelta, distinta a
--     como estaba) + arreglo de lentitud:
--     - calibracion-confianza.tsx se eliminó; su lógica de casos se
--       extrajo a src/lib/calibracion-confianza.ts (casoCalibracion:
--       'sin_puntaje'|'sobreconfianza'|'subconfianza'|'bien_calibrado_alto'
--       |'bien_calibrado_bajo'), reusada tanto para el mensaje informativo
--       como para el placeholder del textarea nuevo.
--     - Nuevo src/app/estudiante/actividad/[id]/reflexion-actividad.tsx:
--       muestra el mensaje de calibración (se conserva) MÁS un textarea
--       real (antes solo había el mensaje pasivo) cuyo placeholder cambia
--       según el caso — ej. sobreconfianza: "¿Qué creías dominar y no era
--       así?"; subconfianza: "¿Qué te hizo dudar de ti...?"; sin puntaje
--       (tipos no auto-calificados): "¿Qué fue lo más difícil...?". Guarda
--       en reflexiones (actividad_id set, unidad_id null, momento='cierre')
--       — mismo patrón que el componente que se había quitado antes;
--       reactiva el constraint reflexiones_unica_por_actividad que llevaba
--       sin usarse desde esa remoción. Igual que bitácora/reflexión de
--       unidad: una vez guardada se muestra de solo lectura con botón
--       "Cambiar".
--     - Arreglo de lentitud, dos partes:
--       1. useEntregaActividad.guardar() ya no espera el RPC
--          verificar_insignias antes de continuar — se dispara sin
--          bloquear (ya estaba documentado como "no debe bloquear" pero
--          seguía con await). Quita un viaje de red completo de cada
--          entrega, en los 9 tipos de actividad.
--       2. Nuevo src/lib/entrega-reciente-context.tsx (Context de React,
--          EntregaRecienteProvider/useEntregaReciente): envuelve el Card
--          de la actividad + el nuevo actividad-post-entrega.tsx en
--          actividad/[id]/page.tsx. useEntregaActividad llama
--          marcarGuardada() justo tras el upsert exitoso, antes de
--          router.refresh() — así la retroalimentación, la reflexión y el
--          botón "Siguiente actividad" aparecen al instante desde estado
--          local en vez de esperar el viaje completo de refresh al
--          servidor (router.refresh() se sigue llamando para mantener
--          todo lo demás sincronizado).
--     - Verificado en vivo: al entregar con confianza alta y puntaje bajo
--       (5/5 y 20%), el mensaje de sobreconfianza y el textarea con su
--       placeholder correcto aparecieron en la misma vuelta, sin recarga
--       visible; guardar la reflexión pasa a modo lectura con "Cambiar";
--       el botón "Siguiente actividad" conserva su comportamiento de la
--       Fase I. Typecheck y build limpios. Datos de prueba limpiados.
--
-- 37. Fase K — portafolio y progreso:
--     - portafolio/page.tsx: ya no consulta ni muestra entregas — ahora
--       compila únicamente reflexiones, tanto la de cierre por unidad
--       (como ya tenía) como las de cierre por actividad (nuevas desde la
--       Fase J), agrupadas bajo la unidad correspondiente vía
--       actividades.unidad_id. Se quitó el import de resumen-respuesta.ts
--       (sigue usándose en la ficha de la docente, no se tocó ese archivo).
--     - progreso/page.tsx rediseñado por completo: se quitó "precisión
--       por tipo de actividad" y "variedad léxica promedio" (más
--       analítica de docente que motivador para un estudiante). Nuevo
--       contenido, todo con tablas ya existentes: racha actual (reusa
--       calcularRacha de src/lib/racha.ts), reflexiones de cierre
--       completadas (X/3), avance por unidad (mismo patrón que
--       inicio/page.tsx), % de actividades donde la confianza estuvo bien
--       calibrada (reusa casoCalibracion de la Fase J) en tono positivo,
--       y metas de bitácora cumplidas (X/3).
--     - Verificado en vivo: portafolio muestra la reflexión de unidad y la
--       de actividad juntas, sin ningún resumen de entrega; progreso
--       muestra las 5 secciones nuevas con datos reales. Typecheck y
--       build limpios. Datos de prueba limpiados.
--
-- 38. Fase L — mejoras de presentación (sin mecánicas nuevas):
--     - opcion-justificacion.tsx / encontrar-corregir.tsx: el checklist de
--       ideas_clave dejó de estar gated por "ya enviado" o por un mínimo de
--       palabras — ahora se muestra completo desde que carga la actividad,
--       marcando cada idea en vivo conforme el estudiante escribe (no hay
--       riesgo de "hacer trampa": son pistas de calidad de la
--       justificación, no la respuesta de opción múltiple).
--     - src/lib/opcion-justificacion.ts: nuevo campo opcional
--       presentacion?: "asistente" | "todas_juntas" en la forma con rondas
--       (default "asistente" = wizard actual, retrocompatible).
--       opcion-justificacion.tsx se refactorizó extrayendo el bloque de una
--       pregunta a un subcomponente (PreguntaRonda) reusado en ambos modos;
--       "todas_juntas" apila todas las rondas en una sola pantalla con un
--       solo botón de envío al final.
--     - etiquetado-texto.tsx: nuevo campo opcional contenido.en_linea?:
--       boolean — cuando es true, los fragmentos se concatenan en un
--       bloque de texto corrido con un <select> incrustado justo después
--       de cada fragmento, en vez de tarjetas separadas; el indicador de
--       correcto/incorrecto pasa a ser un ícono o badge en línea junto al
--       select.
--     - Contenido (solo datos, sin cambio de tipo_id): presentacion =
--       "todas_juntas" en "Niveles de la lengua", "Tipologías textuales" e
--       "Identifica el modelo expositivo" (para que no se resuelvan por
--       descarte). en_linea = true solo en "Uso del punto: seguido, aparte
--       y final" (única actividad de etiquetado_texto cuyos fragmentos
--       arman un párrafo corrido; "Variaciones y deformaciones de la
--       lengua" tiene fragmentos independientes y se queda en tarjetas).
--     - Verificado en vivo con estudiante QA temporal: "Uso del punto" en
--       línea muestra el texto corrido con selects incrustados y el badge
--       "(era: ...)" solo en el fragmento incorrecto; "Niveles de la
--       lengua" en modo todas_juntas muestra las 3 preguntas juntas, cada
--       ideas_clave marcándose en vivo, y guarda con un solo envío.
--       Typecheck y build limpios. Datos de prueba limpiados.
--
-- 39. Fase M — @dnd-kit + nuevo tipo ordenar_fragmentos:
--     - Se agregan las dependencias @dnd-kit/core, @dnd-kit/sortable y
--       @dnd-kit/utilities (npm install, sin cambios de configuración).
--     - Nueva fila en tipos_actividad: "ordenar_fragmentos" — el estudiante
--       elige, de una bolsa revuelta de fragmentos (que incluye
--       distractores), solo los que pertenecen y los ordena para armar un
--       texto coherente; puede reordenar arrastrando (drag-and-drop con
--       dnd-kit, patrón sortable estándar con manejador dedicado, o
--       quitar/agregar tocando cada chip) y ve una vista previa en vivo del
--       texto armado para autoevaluar si fluye.
--     - Forma de contenido: { contexto?: string; fragmentos: string[]
--       (bolsa revuelta, incluye distractores); orden_correcto: number[]
--       (índices dentro de fragmentos, en la secuencia correcta, solo los
--       que pertenecen) }. Respuesta: { orden: number[] } (índices elegidos
--       por el estudiante, en su orden). Calificación automática:
--       puntaje_auto = posiciones que coinciden entre orden y
--       orden_correcto, dividido entre orden_correcto.length.
--     - Nuevo componente estudiante/actividad/[id]/ordenar-fragmentos.tsx.
--       Se agrega a TIPOS_CONSTRUIDOS y al switch de tipos en
--       actividad/[id]/page.tsx, y a ICONO_TIPO
--       (src/lib/tipo-actividad-icono.ts).
--     - actividad-form.tsx: nueva sección de autoría — la docente escribe
--       los fragmentos ya en el orden correcto (uno por línea) y los
--       distractores aparte (opcional); al guardar, el servidor del
--       navegador de la docente revuelve ambas listas una sola vez y
--       calcula orden_correcto contra los índices ya revueltos, para que
--       el contenido guardado en la base quede fijo (mismo orden revuelto
--       para todos los estudiantes).
--     - Migración de contenido: "Coherencia global del texto" (antes
--       clasificacion, 3 elementos "pertenece al mensaje" + 3
--       distractores) cambia de tipo_id y de forma de contenido a
--       ordenar_fragmentos, conservando los mismos 6 textos. Se reescribe
--       también actividades.instrucciones para describir la mecánica de
--       ordenar en vez de clasificar. Sin riesgo de entregas huérfanas:
--       no hay datos reales de estudiantes en este momento.
--     - Verificado en vivo con estudiante QA temporal: agregar fragmentos
--       a la secuencia tocándolos, quitarlos de vuelta a la bolsa,
--       reordenar y la vista previa del texto armado se actualiza en cada
--       cambio; al guardar con la secuencia correcta se calificó 100% y
--       la actividad quedó bloqueada mostrando los íconos de
--       correcto/incorrecto. Typecheck y build limpios. Datos de prueba
--       limpiados.
--
-- 40. Fase N — comparador con chips arrastrables:
--     - comparador.tsx gana dos campos opcionales al contenido:
--       banco_respuestas?: string[] (bolsa de chips predefinidos, puede
--       incluir señuelos de más) y celda_correcta?: string[][] (texto del
--       chip esperado por celda, mismo tamaño que criterios × conceptos).
--       Cuando ambos están presentes, cada celda se vuelve una zona de
--       destino de @dnd-kit (arrastrar o, como alternativa táctil/con
--       teclado, tocar un chip y luego tocar la celda) en vez de un
--       textarea libre, y la actividad se autocalifica (puntaje_auto =
--       celdas correctas / total × 100, estado: "completada"). Sin ambos
--       campos, se mantiene el textarea de texto libre de siempre
--       (retrocompatible con las demás actividades de comparador, que no
--       se tocaron).
--     - actividad-form.tsx: nueva textarea para el banco de chips (una
--       respuesta por línea) + una cuadrícula de <select> (mismo layout
--       que la tabla del estudiante) para mapear la respuesta correcta de
--       cada celda, mismo patrón que ya usan clasificación/etiquetado.
--     - Contenido (SQL): "Exposición individual vs. en equipo" (ya tenía 5
--       criterios × 2 conceptos) gana un banco de 14 chips (10 correctos +
--       4 señuelos) y su celda_correcta correspondiente.
--     - Verificado en vivo con estudiante QA temporal: los chips se
--       colocan tocándolos y tocando la celda destino, una celda ocupada
--       se puede reemplazar sin perder el chip anterior (vuelve al banco),
--       y al completar las 10 celdas correctamente se calificó 100% y la
--       actividad quedó bloqueada. Typecheck y build limpios. Datos de
--       prueba limpiados.
--
-- 41. Fase O — "El circuito de la comunicación" como hilo de chat:
--     - src/lib/opcion-justificacion.ts: nuevo tipo MensajeChat = {de,
--       texto, nota?} y campo opcional mensajes?: MensajeChat[] a nivel
--       superior de la forma con rondas (hermano de intro/rondas/
--       presentacion) — el hilo canónico de mensajes de la actividad.
--       RondaContenido gana mensajesVisibles?: number (cuántos mensajes
--       del hilo mostrar como burbujas en esa ronda; por defecto todos).
--     - opcion-justificacion.tsx: nuevo subcomponente HiloChat — cuando
--       contenido.mensajes existe, se muestra un hilo estilo chat (dos
--       remitentes, burbujas alternadas izquierda/derecha según quién
--       envía, divisor opcional con el texto de "nota" entre mensajes)
--       en vez del párrafo plano de intro. En modo asistente se revela
--       progresivamente según mensajesVisibles de la ronda actual; en
--       modo todas_juntas se muestra el hilo completo una sola vez arriba.
--       Sin contenido.mensajes, el comportamiento no cambia (intro plano
--       como siempre).
--     - Contenido (SQL): "El circuito de la comunicación" reescrita con
--       mensajes = [Ana pregunta, Luis responde 3 horas después con
--       nota="3 horas después"]; mensajesVisibles=1 en las rondas 1-6
--       (todas sobre el primer mensaje de Ana) y 2 en la ronda 7 (sobre
--       la retroalimentación de Luis); se quitó el campo intro plano. Se
--       mantiene en modo asistente (wizard), como pedía el plan.
--     - Verificado en vivo con estudiante QA temporal recorriendo las 7
--       preguntas: solo el mensaje de Ana se ve en las rondas 1-6, y al
--       llegar a la ronda 7 aparece el mensaje de Luis con el divisor "3
--       horas después" y burbuja alineada al lado contrario. Typecheck y
--       build limpios. Datos de prueba limpiados.
--
-- 42. Fase P — "El resumen imposible" simplificado (leer y reflexionar):
--     - redaccion_checklist gana un campo opcional contenido.modo?:
--       "escribir" | "leer_reflexionar" (default "escribir",
--       retrocompatible — redaccion-checklist.tsx no cambió). En modo
--       "leer_reflexionar" se usa un componente hermano nuevo,
--       redaccion-lectura.tsx: sin textarea, checklist ni límite de
--       palabras — en vez de un solo ejemplos_resueltos, usa 3 campos
--       explícitos (ejemplo_resumen, ejemplo_sintesis, ejemplo_parafrasis)
--       mostrados en 3 columnas lado a lado (apiladas en móvil). Al
--       terminar de leer, el estudiante confirma con un botón que guarda
--       una entrega mínima (estado: "completada", respuesta: {}, sin
--       puntaje_auto) — solo para que el conteo de avance de la unidad
--       (Fase I2) siga funcionando igual que con cualquier otra actividad.
--     - ReflexionActividad y ActividadPostEntrega ganan un prop opcional
--       placeholderPersonalizado/placeholderReflexionPersonalizado que
--       reemplaza el placeholder por calibración de siempre — se reusa
--       toda la infraestructura de reflexión de cierre de la Fase J
--       (mismo guardado en reflexiones, misma aparición instantánea) en
--       vez de duplicar lógica, solo se sobreescribe el texto del
--       placeholder para esta actividad: "¿Qué cambia entre el resumen y
--       la síntesis? ¿Y entre la síntesis y la paráfrasis?".
--     - actividad-form.tsx: selector de modo + (en modo lectura) los 3
--       campos de ejemplo explícitos, reemplazando el textarea único de
--       ejemplos_resueltos + límite + checklist de ese modo.
--     - Contenido (SQL): "El resumen imposible" migra a modo
--       leer_reflexionar, separando el bloque ejemplos_resueltos
--       (resumen/síntesis/paráfrasis concatenados) en sus 3 campos
--       explícitos; se aprovechó para quitar un guión largo dentro del
--       ejemplo de síntesis.
--     - Verificado en vivo con estudiante QA temporal: las 3 columnas se
--       ven completas sin textarea ni checklist; al confirmar "Ya leí y
--       comparé los tres" se guarda la entrega mínima y aparece al
--       instante la reflexión con el placeholder personalizado. Typecheck
--       y build limpios. Datos de prueba limpiados.
--
-- 43. Fase Q — contenido faltante (solo datos, sin cambios de código):
--     - Aprendizaje esperado de las 7 actividades de Unidad 2 (antes
--       null): redactado por tema (puntuación, letras que se confunden,
--       acentuación, signos de puntuación, modelos expositivos) y
--       aplicado con un solo UPDATE.
--     - "Técnica ante un escenario: un solo compañero" y "...: todo el
--       grupo" tenían solo 2 rondas cada una y cada técnica (Exposición/
--       Discurso/Debate/Mesa redonda) era la respuesta correcta
--       exactamente una vez entre las 4 rondas totales (se prestaba a
--       resolver por eliminación). Se agregaron 2 rondas nuevas a cada
--       actividad: "un solo compañero" repite Exposición y Discurso (las
--       únicas técnicas que tienen sentido con un solo interlocutor);
--       "todo el grupo" repite Debate y Mesa redonda (las que requieren
--       varias posturas o un moderador) — cada técnica queda como
--       respuesta correcta 2 veces dentro de su propia actividad.
--     - Barrido final de guiones largos en contenido de base de datos
--       (no solo código, cubierto ya en la Fase H): se encontraron y
--       corrigieron 2 títulos de actividad ("... — nivel 2" → "...
--       (nivel 2)"), 2 instrucciones y 6 fragmentos de contenido
--       (contexto/pregunta) en "Uso del punto", "El circuito de la
--       comunicación" y "Las 6 funciones de la lengua (nivel 2)".
--       Verificado con una consulta de barrido: cero coincidencias de
--       "—" en titulo/instrucciones/aprendizaje_esperado/contenido de
--       actividades ni en nombre/unidad_competencia de unidades.
--     - Sin cambios de código en esta fase; no aplica typecheck/build.
--       Verificado en vivo con estudiante QA temporal que "Técnica ante
--       un escenario: un solo compañero" carga sus 4 rondas
--       correctamente. Datos de prueba limpiados.
--
-- === Fin de las Fases H-Q (segunda ronda de observaciones) ===
--
-- 44. Fase R — ancho de página + video como paso separado (tercera ronda):
--     - actividad/[id]/page.tsx, progreso/page.tsx y calendario/page.tsx
--       pasan de max-w-lg (32rem) a max-w-2xl (42rem), igualando al resto
--       del hub del estudiante (inicio, unidad/[id], portafolio,
--       insignias, bottom-nav) — antes se veían más angostas, con espacio
--       lateral desperdiciado en pantallas anchas.
--     - Nuevo componente estudiante/actividad/[id]/video-intro.tsx: si la
--       actividad tiene video_url y el estudiante todavía no tiene
--       entrega, se muestra SOLO el video + botón "Continuar a la
--       actividad" — el resto del contenido (UC/AE, predicción, la
--       actividad en sí) queda oculto hasta que el estudiante confirma.
--       Si no hay video, o ya hay entrega (quien vuelve a revisar sus
--       respuestas no debe tener que "pasar" el video de nuevo), se
--       salta directo al contenido. Se quita el placeholder "Video
--       próximamente" de la Fase H6 — ya no aplica, el video ahora es un
--       paso que aparece solo cuando existe.
--     - Verificado en vivo con estudiante QA temporal: con un video_url
--       de prueba, la actividad muestra solo el video y el botón de
--       continuar; al hacer clic aparece el resto (UC/AE + predicción);
--       el contenedor mide 672px (max-w-2xl) en vez de los 512px
--       anteriores. Typecheck y build limpios. Datos de prueba limpiados
--       (incluyendo el video_url de prueba, revertido a null).
--
-- 45. Fase S — opcion_justificacion autocalificable:
--     - RondaContenido gana respuesta_correcta: string (obligatorio, debe
--       ser una de las opciones). opcion-justificacion.tsx calcula
--       puntaje_auto (aciertos/total × 100) y guarda con estado:
--       "completada" en vez de "pendiente_revision" sin puntaje — esto
--       habilita que casoCalibracion() (Fase J) deje de caer siempre en
--       "sin_puntaje" para el tipo de actividad más usado (6 de las ~25
--       actividades). Una vez enviada, la actividad se bloquea (radios y
--       textarea deshabilitados) y cada opción muestra su estado: la
--       correcta en verde, la elegida incorrecta en rojo — igual patrón
--       visual que clasificación/etiquetado. El bloque de ideas_clave no
--       cambia (sigue siendo pista de calidad de la justificación,
--       independiente de la calificación de la opción).
--     - actividad-form.tsx: nuevo <Select> "Respuesta correcta" por
--       ronda, poblado con las opciones ya escritas arriba; valida que se
--       haya elegido una que exista en la lista antes de guardar.
--     - docente/grupos/[id]/page.tsx: comentario actualizado (ya no dice
--       "solo clasificación y etiquetado tienen puntaje_auto"). Las
--       entregas de opcion_justificacion dejan de aparecer en la cola
--       "por revisar" (esperado: ya no necesitan calificación manual; la
--       docente sigue viendo y pudiendo comentar la justificación).
--     - Contenido (SQL): se agregó respuesta_correcta a las 26 rondas
--       existentes en las 6 actividades de este tipo (El circuito de la
--       comunicación, Niveles de la lengua, Tipologías textuales,
--       Identifica el modelo expositivo, y las 2 "Técnica ante un
--       escenario") — las respuestas ya estaban implícitas en el
--       contenido/ideas_clave autorado en fases anteriores.
--     - Verificado en vivo con estudiante QA temporal en "Niveles de la
--       lengua" (modo todas_juntas): 2 aciertos + 1 error intencional
--       calificó 67%, el mensaje de calibración de confianza apareció
--       correctamente ("Tu confianza (4/5) estuvo bien calibrada con tu
--       resultado (67%)" — antes nunca aparecía para este tipo), la
--       opción correcta de cada pregunta se resaltó en verde y la opción
--       incorrecta elegida en rojo, y los 3 radios quedaron bloqueados.
--       Typecheck y build limpios. Datos de prueba limpiados.
--
-- 46. Fase T — actividades de "dos niveles": ocultar respuesta, reiniciar,
--     desordenar (aplica solo a las 4 actividades de los 2 pares nivel
--     1/nivel 2 existentes, todas clasificacion):
--     - actividad/[id]/page.tsx calcula esDosNiveles = esta actividad
--       requiere a otra (es nivel 2) O alguna hermana de la unidad la
--       requiere a ella (es nivel 1) — reusa la consulta "hermanas" ya
--       existente, agregando requiere_actividad_id a su select.
--     - clasificacion.tsx gana la prop dosNiveles: cuando es true, (a) el
--       orden de los elementos y de las categorías se revuelve una sola
--       vez por carga de página (useMemo con deps vacías) conservando el
--       índice original para no romper la calificación; (b) al bloquear
--       tras enviar, ya no se muestra "Era: {categoria_correcta}" — solo
--       "Correcto"/"Incorrecto"; (c) aparece un botón "Reiniciar prueba"
--       que, tras confirmar, borra la entrega y las reflexiones
--       (momento prediccion y cierre) de esa actividad para ese
--       estudiante y hace un window.location.reload() — recarga dura, no
--       router.refresh(), porque EntregaRecienteProvider guarda su
--       estado inicial en un useState que no se resincroniza solo con un
--       refresh de Server Components.
--     - Sin cambios en actividad-form.tsx: el flag se deriva de
--       requiere_actividad_id, ya configurable desde la Fase I.
--     - Verificado en vivo con estudiante QA temporal en "Las 6 funciones
--       de la lengua": el orden de las 12 tarjetas y de las 6 categorías
--       llegó revuelto respecto al orden guardado en la base; con 2
--       errores intencionales se calificó 83% y solo se vieron
--       "Correcto"/"Incorrecto" (nunca la respuesta correcta); el botón
--       "Reiniciar prueba" borró la entrega y la predicción (confirmado
--       por consulta: 0 filas) y la página volvió a mostrar la pantalla
--       de confianza desde cero. Typecheck y build limpios. Datos de
--       prueba limpiados.
--
-- 47. Fase U — "Coherencia" menos obvia + pulido del chat:
--     - "Coherencia global del texto": los 3 distractores (antes: mole/
--       sushi, viajar, cifras de turismo — de un tema totalmente distinto
--       a interculturalidad, se resolvía "por tema" sin leer) se
--       reescribieron del MISMO tema (políticas de lenguas indígenas,
--       globalización laboral, bilingüismo y memoria) pero sin encajar en
--       la secuencia lógica de las 3 correctas — ahora exige leer el
--       argumento, no solo detectar el tema ajeno. orden_correcto
--       recalculado para los nuevos índices; instrucciones actualizadas.
--       Sin cambios de código (mismo componente ordenar-fragmentos.tsx de
--       la Fase M).
--     - "El circuito de la comunicación" (HiloChat, dentro de
--       opcion-justificacion.tsx): pulido visual agregado de paso durante
--       la Fase S — cada burbuja ahora lleva un avatar circular con la
--       inicial del remitente (Ana/Luis) y sombra sutil, en vez de solo
--       texto plano.
--     - Verificado en vivo con estudiante QA temporal: los 6 fragmentos
--       de "Coherencia" se ven todos sobre el mismo tema (interculturalidad/
--       lenguas/globalización), sin distractor obviamente ajeno.
--
-- 48. Fase V — reset y reseed de la cuenta de revisión (solo datos, sobre
--     la cuenta real de revisión, no una cuenta QA desechable):
--     - Se borraron todas las entregas, reflexiones y bitácora de
--       ESTUDIANTE DE REVISIÓN (id 1b0c4522-cb9f-4250-9e5f-bfb6a5d553fa).
--     - Se completaron las 23 actividades que NO son de nivel 2 (de las
--       25 totales) con la respuesta objetivamente correcta de cada una
--       (100% en las 22 auto-calificables; "El resumen imposible" queda
--       como entrega mínima sin puntaje, como se diseñó en la Fase P) y
--       su predicción de confianza (4/5). Se agregó también la reflexión
--       de cierre de cada una de las 3 unidades.
--     - Las 2 actividades de nivel 2 ("Las 6 funciones de la lengua
--       (nivel 2)" e "Ideas principal, secundaria y terciaria (nivel 2)")
--       se dejaron sin ninguna fila a propósito — desbloqueadas (su nivel
--       1 ya tiene 100%) pero sin intentar, listas para probar el flujo
--       de la Fase T (orden revuelto, sin revelar respuesta, reiniciar).
--     - Verificado por consulta: 23 entregas, 23 predicciones, 3 cierres
--       de unidad, y exactamente 0 filas (entregas y reflexiones) para
--       las 2 actividades de nivel 2.
--     - Aviso importante para la usuaria: la Unidad 1 tiene 13
--       actividades en total (cuenta las 2 de nivel 2), así que con 11/13
--       hechas NO se marca "completa" bajo la lógica actual de
--       unidadEstaCompleta() (Fase I2) — esto bloquea la navegación
--       normal hacia la Unidad 2 y, en cascada, hacia la Unidad 3, aunque
--       sus 12 actividades ya tienen entrega al 100% en la base. Es un
--       efecto secundario de dejar nivel 2 pendiente a propósito, no un
--       bug nuevo introducido aquí — se le explicó a la usuaria en el
--       resumen de esta fase, ofreciendo excluir nivel 2 del conteo de
--       "unidad completa" si prefiere poder navegar directo a las
--       Unidades 2 y 3 sin antes resolver las de nivel 2.
--
-- === Cuarta ronda de observaciones (Fases W en adelante) ===
--
-- 49. Fase W — contenido rápido: circuito extendido, técnicas juntas,
--     comparador rehecho (sin cambios de código, toda la mecánica ya
--     existía de fases anteriores):
--     - "El circuito de la comunicación": el hilo pasa de 2 a 4 mensajes
--       (Ana pregunta → Luis no entiende, 3 horas después → Ana aclara
--       qué era "lo de mañana", unos minutos después → Luis confirma).
--       Se agregaron 2 rondas nuevas (9 en total) sobre esta segunda
--       parte del intercambio: una sobre la mejora en claridad del
--       código de Ana, otra sobre el cierre exitoso del circuito con la
--       confirmación de Luis — ambas con su respuesta_correcta.
--     - "Técnica ante un escenario" (×2): se agregó
--       "presentacion": "todas_juntas" a su contenido.
--     - "Exposición individual vs. en equipo": se reescribieron los 5
--       criterios (ahora frases nominales en vez de preguntas, ej.
--       "Preparación del contenido" en vez de "¿Qué ventaja tiene?") y
--       el banco de 14 chips (10 correctos + 4 señuelos) con respuestas
--       más concretas y menos repetitivas entre sí.
--     - Verificado en vivo con estudiante QA temporal: el hilo de chat
--       muestra los 4 mensajes con avatares y el divisor "unos minutos
--       después"; la actividad llega hasta "Pregunta 9 de 9" navegando
--       con "Siguiente". Datos de prueba limpiados.
--
-- 50. Fase X — reflexión de cierre de unidad, calibrada por desempeño real
--     (deja de repetir la pregunta de seguridad del inicio; solo cambios
--     de código, sin migración de contenido):
--     - src/lib/calibracion-confianza.ts: se extrajo el núcleo de
--       casoCalibracion a una función interna basada en porcentajes
--       (casoCalibracionPct), reutilizada por casoCalibracion (nivel
--       actividad, convierte 1-5 a %) y por dos funciones nuevas a nivel
--       unidad que ya reciben porcentaje directo (autoevaluaciones_
--       confianza.valor es 0-100): mensajeCalibracionUnidad y
--       placeholderReflexionUnidad, con copy de estrategia de estudio en
--       vez de dificultad puntual de una actividad.
--     - unidad/[id]/page.tsx: se quitó el segundo <Confianza
--       momento="cierre"> (ya no se vuelve a preguntar seguridad al
--       final) y el resumen viejo "tu confianza pasó de X% a Y%". El
--       promedio real de desempeño de la unidad (promedioUnidad) se
--       calcula de los mismos datos que la página ya trae
--       (actividades[].entregas[].puntaje_auto, usado para el gating de
--       nivel 2) — sin consulta nueva.
--     - confianza.tsx: se quitó el prop `momento` (solo queda "inicio",
--       hardcodeado); autoevaluaciones_confianza.momento='cierre' deja de
--       escribirse desde aquí (las filas viejas, si las hay, ya no se
--       leen — sin necesidad de migración).
--     - reflexion-cierre.tsx: ganó props confianzaInicioPct/
--       promedioUnidad; muestra el mensaje de mensajeCalibracionUnidad
--       (si hay datos) arriba del formulario —tanto en el estado
--       colapsado como en el de edición— y el placeholder del Textarea
--       usa placeholderReflexionUnidad, mismo patrón visual que
--       reflexion-actividad.tsx (Fase J).
--     - Verificado en vivo con estudiante QA temporal (datos de entregas
--       y confianza insertados directo por SQL, sin rehacer las 13
--       actividades de Unidad 1 a mano): caso sobreconfianza (confianza
--       inicial 90%, promedio real 40%) mostró "...te confiaste de más"
--       y el placeholder de estrategia correspondiente; caso bien
--       calibrado (75% vs. 80%) mostró "...estuvo bien calibrada con tu
--       resultado promedio". Ningún caso mostró la pregunta de seguridad
--       repetida al final. Datos de prueba limpiados (entregas,
--       reflexiones, autoevaluaciones_confianza, estudiante, auth.users).
--
-- 51. Fase Y — Unidad 2 rediseñada: texto largo con espacios pequeños
--     incrustados, en 4 actividades de complejidad creciente (en vez de 6
--     actividades separadas por categoría gramatical):
--     - src/app/estudiante/actividad/[id]/etiquetado-texto.tsx: el tipo
--       Fragmento gana `opciones?: string[]` — en modo en_linea, cada
--       <Select> usa `f.opciones ?? contenido.etiquetas`, así un mismo
--       texto mezcla blancos de distinta naturaleza (tipo de punto,
--       mayúscula/minúscula, tilde diacrítica, letra faltante, signo de
--       puntuación) sin compartir una sola lista global de opciones. Cast
--       equivalente actualizado en actividad/[id]/page.tsx. Se redujo aún
--       más el tamaño del <select> en línea (!text-xs !px-1.5 !py-0.5).
--     - Y2 (UI de autoría en actividad-form.tsx para las opciones por
--       fragmento) queda PENDIENTE a propósito, documentado aquí: igual
--       que `en_linea` (sin toggle en el formulario desde la Fase L), las
--       4 actividades nuevas se autoraron directo por SQL — no bloquea el
--       resto de la fase.
--     - Contenido: se reescribieron 4 actividades reusando 4 ids
--       existentes (para no romper referencias) y cambiando su tipo a
--       etiquetado_texto donde hacía falta:
--       · df9b1096 "Uso del punto..." → "Puntuación básica: puntos y
--         mayúsculas" (orden 1, ya era etiquetado_texto): 8 blancos —
--         5 de tipo de punto + 3 de mayúscula/minúscula (nombre propio,
--         día de la semana, nombre de materia — estos 2 últimos
--         aprovechan la interferencia con el inglés, que si capitaliza
--         días/meses/materias).
--       · aaadbd59 "Uso de la coma" → "+ Comas, punto y coma, dos puntos
--         y signos de pregunta/exclamación" (orden 2, clasificacion →
--         etiquetado_texto): 8 blancos — 3 de coma sí/no, 3 de punto y
--         coma/dos puntos/ninguno, 2 de ¿...?/¡...!/ninguno sobre
--         preguntas y exclamaciones reportadas en diálogo indirecto con
--         dos puntos (se evitó a propósito la pregunta indirecta con
--         "si", que en español nunca lleva ¿?).
--       · 719397f7 "Punto y coma y dos puntos" → "+ Acentuación y letras
--         que se confunden" (orden 3, clasificacion → etiquetado_texto):
--         8 blancos — 3 de tilde diacrítica (tu/tú, si/sí usado dos
--         veces para contrastar sus dos usos en el mismo texto), 3 de
--         letra faltante (B/V, S/C/Z, G/J, con el guión bajo como blanco
--         visual, igual que la actividad que reemplaza), 1 de coma y 1
--         de punto (retomados de las 2 actividades anteriores).
--       · 02e9a559 "Letras que se confunden..." → "Repaso integrador de
--         ortografía" (orden 4, clasificacion → etiquetado_texto): único
--         texto que junta las 9 categorías — puntos, mayúsculas, comas,
--         punto y coma/dos puntos, tilde, letra, y el bloque de 5 signos
--         (¿...?/¡...!/comillas/paréntesis/raya de diálogo) que absorbe
--         el contenido de la actividad de signos que se elimina — 12
--         blancos en total.
--     - Se BORRARON 33b25dc0 ("Acentuación: agudas, graves...") y
--       8f17c10d ("Signos de puntuación: uso y función") — su contenido
--       queda absorbido en las 4 de arriba. Se limpiaron antes sus
--       entregas/reflexiones de la cuenta de revisión (solo lo mínimo
--       para poder borrar por FK; el reseed completo de Unidad 2 es la
--       Fase AA).
--     - f289d6f0 "Identifica el modelo expositivo" se renumeró de
--       orden=7 a orden=5 (sin cambios de contenido) — queda como última
--       actividad de la unidad, ahora de 5 actividades (antes 7).
--     - Verificado en vivo con estudiante QA temporal, resolviendo las 4
--       actividades completas con las respuestas correctas de cada
--       blanco (calculadas a mano por tipo de decisión): las 4 dieron
--       puntaje_auto = 100, confirmando que la lógica de calificación
--       existente de etiquetado_texto (comparación índice a índice)
--       sigue funcionando sin cambios sobre el contenido nuevo con
--       opciones por fragmento. Los textos se leyeron como narrativas
--       coherentes, no como listas de oraciones sueltas. Datos de
--       prueba limpiados.
--
-- 52. Fase Z — "Cualidades internas y externas de la exposición oral"
--     rediseñada: evaluar dos videos en vez de clasificar 15 conceptos:
--     - Nuevo tipo `evaluar_videos` (insertado en tipos_actividad).
--       Contenido: { intro?, cualidades: string[], video_bien: { url,
--       presentes: string[] }, video_mal: { url, ausentes: string[] } }.
--       Respuesta: { marcadas_bien: string[], marcadas_mal: string[] }.
--       Calificación: coincidencia binaria por cualidad y por video (¿el
--       estado marcado — sí/no — coincide con el correcto?), sumada y
--       dividida entre cualidades.length × 2 — dar 5 de 6 correctas suma
--       parcial, no es todo-o-nada por conjunto completo.
--     - Nuevo componente src/app/estudiante/actividad/[id]/evaluar-videos.tsx:
--       dos bloques (Video A "sí respeta las cualidades" / Video B "no
--       las respeta"), cada uno con su embed de YouTube (urlEmbedYoutube)
--       o un EmptyState "Video próximamente" si `url` es null, seguido de
--       un checklist de las `cualidades` para marcar cuáles identifica en
--       ESE video. Al enviar, se bloquea y se muestra ✓/✗ por cualidad y
--       por video (mismo patrón visual que clasificacion.tsx).
--     - actividad/[id]/page.tsx: agregado a TIPOS_CONSTRUIDOS y al
--       switch. lib/tipo-actividad-icono.ts: ícono Video para el tipo.
--     - actividad-form.tsx: nueva sección de autoría — intro, textarea de
--       cualidades (una por línea), URL + checklist de "cuáles cualidades
--       sí demuestra" para el Video A, URL + checklist de "cuáles le
--       hacen falta" para el Video B (mismo patrón de checklist ya usado
--       en redaccion_checklist, ahora reutilizable porque las cualidades
--       pasan por el mismo parser `lineas()` que el resto de campos "uno
--       por línea"). Persistencia de borrador extendida con los 6 campos
--       nuevos.
--     - Migración de contenido: "Cualidades internas y externas de la
--       exposición oral" cambia tipo_id a evaluar_videos, con 8
--       cualidades (subconjunto de las 15 originales) y AMBOS
--       video_bien.url/video_mal.url en null — no hay videos reales
--       todavía, y no se debe inventar ninguna URL. Por la misma razón,
--       video_bien.presentes y video_mal.ausentes quedan como arrays
--       vacíos: no se puede afirmar qué cualidades demuestra o le faltan
--       a un video que no existe. **Pendiente para la docente**: una vez
--       que suba los 2 videos reales, tiene que volver a esta actividad
--       en su panel y marcar manualmente, viéndolos, cuáles cualidades sí
--       demuestra el Video A y cuáles le faltan al Video B — mientras
--       tanto, con ambos conjuntos vacíos, la actividad califica 100% a
--       cualquiera que no marque nada (matemáticamente correcto pero
--       pedagógicamente vacío hasta que se complete).
--     - Verificado en vivo con estudiante QA temporal: la actividad
--       muestra los 2 bloques con "Video próximamente" y sus checklists;
--       al enviar sin marcar nada, calificó 100% (consistente con los
--       conjuntos correctos vacíos). Verificado también en vivo con la
--       cuenta de revisión de la docente: el formulario de edición
--       carga el tipo "evaluar_videos", las 8 cualidades y ambos
--       checklists correctamente pre-llenados (ninguno marcado); no se
--       guardaron cambios durante la verificación. Datos de prueba
--       limpiados.
--
-- 53. Fase AA — reseed de la cuenta de revisión para todo lo cambiado en
--     las Fases W-Z (sobre ESTUDIANTE DE REVISIÓN, id
--     1b0c4522-cb9f-4250-9e5f-bfb6a5d553fa):
--     - Se borraron entregas + reflexiones (momento='prediccion')
--       desactualizadas de: las 4 actividades de Unidad 2 (df9b1096,
--       aaadbd59, 719397f7, 02e9a559 — cambiaron de forma en Fase Y),
--       "El circuito de la comunicación" (9 rondas nuevas, Fase W),
--       ambas "Técnica ante un escenario" y "Exposición individual vs.
--       en equipo" (banco nuevo, Fase W). NO se tocó "Identifica el
--       modelo expositivo" (solo cambió su orden, sin cambio de
--       contenido) ni "Cualidades..." (ya sin entrega desde la Fase Z).
--     - Se reinsertaron 8 entregas 100%-correctas + su predicción de
--       confianza (4/5), derivando la respuesta directo del contenido
--       de cada actividad por SQL (mismo patrón que la Fase V): para
--       etiquetado_texto, `elegidas` = etiqueta_correcta de cada
--       fragmento en orden; para opcion_justificacion, `rondas[].opcion`
--       = respuesta_correcta de cada ronda; para comparador, `celdas` =
--       `celda_correcta` directo.
--     - **Hallazgo importante, no una acción mía**: al revisar el estado
--       antes de tocar nada, la Unidad 1 ya tenía sus 2 actividades de
--       nivel 2 completadas de verdad (17% y 67%, con timestamps de
--       "ahora") y una confianza inicial de unidad genuina (15%) — la
--       usuaria ya había estado probando el flujo de reinicio de la
--       Fase T por su cuenta. No se tocó nada de eso.
--     - **Efecto secundario a comunicar**: al dejar "Cualidades..." sin
--       entrega (Fase Z, a propósito), la Unidad 3 pasa de 5/5 a 4/5 —
--       esto significa que su reflexión de cierre de Unidad 3 (que ya
--       existía, con texto propio) DEJA DE MOSTRARSE en la página de la
--       unidad hasta que "Cualidades..." tenga una entrega real (con
--       videos ya subidos). La fila de esa reflexión sigue en la base,
--       solo se oculta por la condición `unidadCompleta` — no se pierde,
--       pero conviene que la usuaria lo sepa antes de notar que
--       "desapareció".
--     - **Aviso honesto sobre las 4 actividades de Unidad 2, el circuito,
--       las técnicas y el comparador de equipo**: si la usuaria alcanzó
--       a probar alguna de ellas con su forma ANTERIOR (antes de las
--       Fases W/Y) durante la ventana entre esa migración y este reseed,
--       ese intento específico ya no existe — se reemplazó por la
--       entrega de prueba 100% de esta fase, porque el cambio de forma
--       del contenido (tipo distinto, rondas distintas, banco distinto)
--       hace imposible conservar una respuesta vieja compatible.
--     - Verificado por consulta: Unidad 2 ahora 5/5 con promedio 100%;
--       Unidad 3 ahora 4/5 (Cualidades pendiente a propósito) con
--       promedio 100% sobre las 4 completadas; "El circuito..." con 9
--       rondas completas y respuestas correctas verificadas en la
--       primera y última ronda.
--
-- === Quinta ronda de observaciones ===
--
-- 54. Fase AB — dos correcciones puntuales pedidas tras revisar en vivo:
--     - **Desalineación de etiquetado_texto en_linea**: el contenedor
--       usaba `flex flex-wrap items-center` con cada fragmento como un
--       `inline-flex` (texto + <select> juntos). Cuando un fragmento era
--       una oración larga que ocupaba 2-3 líneas, `items-center` centraba
--       el <select> contra la altura TOTAL del fragmento envuelto, así
--       que el menú terminaba flotando a medio párrafo en vez de pegado
--       a la última palabra — exactamente el "todo se desalinea" que
--       reportó la usuaria, y se notaba mucho más en la Unidad 2 nueva
--       (Fase Y) por tener textos largos con 8-12 blancos mezclados.
--       src/app/estudiante/actividad/[id]/etiquetado-texto.tsx: se quitó
--       el flexbox por completo — ahora es un <p> de flujo normal
--       (`display: block`) con cada <select> nativo como `inline-block`
--       dentro del texto, igual que cualquier palabra: el navegador hace
--       el salto de línea él solo, sin centrado artificial. El <select>
--       se restyled como chip compacto (borde inferior punteado, fondo
--       de color) que cambia a verde/rojo una vez calificado, sin el
--       ícono de check/x que antes competía por espacio en la línea.
--     - **Reflexión de cierre de unidad no aparecía de inmediato**: antes,
--       terminar la última actividad de una unidad solo llevaba de vuelta
--       a la lista de la unidad, donde la reflexión de cierre aparecía
--       hasta abajo, sin ningún aviso — la usuaria pidió que apareciera
--       "de inmediato" con un mensaje de felicitación, en el mismo lugar
--       donde el estudiante termina.
--       - actividad/[id]/page.tsx: la consulta de `hermanas` ahora trae
--         también `entregas(puntaje_auto)` de cada actividad de la
--         unidad; con eso se calcula `unidadRecienCompletada` (esta
--         entrega existe Y todas las hermanas ya tienen la suya) sin
--         una consulta aparte. Si es así, se arma un objeto con el
--         mensaje de felicitación, el promedio real de la unidad (mismo
--         cálculo que en unidad/[id]/page.tsx), la confianza inicial, la
--         meta de bitácora, la reflexión de cierre previa (si la hay), y
--         el link a la unidad siguiente (o a inicio si era la última) —
--         se pasa como prop `unidadCompletada` a ActividadPostEntrega.
--       - Nuevo componente celebracion-unidad.tsx: reutiliza
--         ReflexionCierre (el mismo componente de la Fase X, importado
--         directo de la carpeta de la unidad) dentro de una tarjeta verde
--         con ícono de fiesta y el mensaje de felicitación, seguida del
--         botón "Continuar a Unidad X" (o "Volver al inicio" si era la
--         última unidad).
--       - actividad-post-entrega.tsx: cuando recibe `unidadCompletada`,
--         muestra ese bloque en vez del botón simple "Siguiente
--         actividad/Volver a la unidad" — la reflexión de la actividad
--         individual (ReflexionActividad) se sigue mostrando igual,
--         arriba, sin cambios.
--       - La página de la unidad (unidad/[id]/page.tsx) no se tocó: sigue
--         mostrando la reflexión de cierre si se vuelve a visitar más
--         tarde para editarla, como punto de acceso secundario.
--     - Verificado en vivo con estudiante QA temporal: se completaron la
--       Unidad 1 y 4 de las 5 actividades de Unidad 2 por SQL, dejando
--       "Repaso integrador de ortografía" (el texto con más blancos
--       mezclados) para resolverla en el navegador — el texto se leyó
--       de corrido sin saltos raros (confirmado también por estructura
--       DOM: contenedor `display:block`, cada <select> `inline-block`
--       con `vertical-align:middle`); al enviar la última actividad, en
--       la misma página apareció de inmediato "¡Completaste la Unidad 2:
--       Exposición escrita!" con el mensaje de calibración correcto
--       ("dijiste sentirte solo 60% seguro, pero tu resultado promedio
--       fue 100%...") y el botón "Continuar a Unidad 3: Exposición
--       oral". Datos de prueba limpiados.
--
-- 55. Fase AC — tres correcciones más, pedidas tras revisar en vivo:
--     - **Reflexiones ya no se pueden cambiar**: se quitó el botón
--       "Cambiar" de reflexion-actividad.tsx y de reflexion-cierre.tsx —
--       una vez guardada, la reflexión (de actividad o de cierre de
--       unidad) queda fija para siempre, igual que una entrega
--       calificada. Antes se podía reescribir después de ver el
--       resultado, lo cual le quitaba sentido a que fuera una fotografía
--       honesta del momento.
--     - **Opciones de las 4 actividades de ortografía de Unidad 2,
--       ahora con el signo real en vez del nombre de la categoría**: se
--       reescribieron las etiquetas/opciones de las 4 actividades (sin
--       tocar el texto de los fragmentos ni la estructura) —
--       "Punto y seguido/aparte/final" → ". seguido"/". aparte"/". final";
--       "Mayúscula/Minúscula" → "A"/"a"; "Va coma/No va coma" → ","/"nada";
--       "Punto y coma/Dos puntos/Ninguno" → ";"/":"/"nada";
--       "Interrogación/Exclamación/Ninguno" → "¿?"/"¡!"/"nada";
--       "Comillas/Paréntesis/Raya/Ninguno" → "« »"/"( )"/"—"/"nada";
--       las tildes diacríticas (tu/tú, si/sí) se dejaron como las
--       palabras mismas, sin la aclaración entre paréntesis; las letras
--       (B/V, S/C/Z, G/J) no cambiaron, ya eran solo la letra.
--     - **"Cualidades..." (evaluar_videos) — se llenaron `presentes` y
--       `ausentes` con las 8 cualidades completas** (antes se habían
--       dejado como arrays vacíos por no tener los videos todavía): la
--       usuaria aclaró que "pendiente el video" solo significa que el
--       archivo/URL falta, no que el resto del contenido deba quedar
--       incompleto — video_bien.presentes = las 8 cualidades (modelo a
--       seguir al grabar); video_mal.ausentes = las 8 cualidades (todas
--       ausentes, como guion claro de qué evitar al grabar el segundo
--       video). video_bien.url y video_mal.url siguen en null — eso sí
--       es lo único que falta agregar cuando existan los videos reales.
--     - **Bug propio descubierto y corregido durante la verificación**:
--       cambiar las etiquetas de las 4 actividades de Unidad 2 dejó
--       desalineadas las entregas ya guardadas de la cuenta de revisión
--       (Fase AA), que tenían el `respuesta.elegidas` con las etiquetas
--       VIEJAS en texto — al recalcular contra las etiquetas nuevas
--       (símbolos), cada comparación fallaba aunque puntaje_auto en la
--       base siguiera diciendo 100. Se volvieron a regenerar esas 4
--       entregas con las etiquetas nuevas (mismo patrón de siempre:
--       derivado directo de `contenido`).
--     - **Nota de proceso**: durante la verificación, una sesión de
--       navegador con un auth_user_id de una cuenta QA ya borrada
--       (session anónima huérfana, no cerrada explícitamente entre
--       pruebas) terminó mostrando por unos segundos datos de la cuenta
--       de revisión real en vez de la cuenta QA nueva — no se escribió
--       nada nuevo sobre esos datos (la página solo los leyó), pero
--       confirmó por qué siempre hay que cerrar sesión (localStorage +
--       cookies) entre cuentas QA temporales, no solo borrar sus filas.
--     - Verificado en vivo con estudiante QA temporal (con cierre de
--       sesión explícito antes de empezar, esta vez): las 4 actividades
--       de Unidad 2 con las opciones nuevas dieron 100% correctas; la
--       reflexión de actividad y la de cierre de unidad, una vez
--       guardadas, no mostraron botón "Cambiar" en ningún caso. Datos de
--       prueba limpiados y sesión de navegador cerrada al final.
--
-- 56. Fase AD — quinta ronda de observaciones: nuevo mecanismo de
--     ortografía (reescribir en vez de elegir), portafolio, navegación,
--     video y AE tomados del programa oficial:
--     - **Portafolio (dato, no bug)**: la cuenta de revisión tenía 23
--       predicciones de confianza pero solo 1 reflexión de cierre por
--       actividad (las Fases V/AA sembraron entregas por SQL sin nunca
--       escribir el texto libre de "qué aprendiste"). Se insertaron 19
--       reflexiones placeholder ("Reflexión de prueba: repasé el tema y
--       pude aplicarlo en la actividad.") para las actividades con
--       entrega que no tenían una — sin tocar las 2 de nivel 2 (esas son
--       intentos genuinos de la usuaria, no se les inventa nada).
--     - **Nuevo tipo `corregir_ortografia`**: reemplaza el mecanismo de
--       dropdowns en línea (Fases Y/AB/AC) que la usuaria rechazó dos
--       veces. Contenido: { contexto?, texto_incorrecto, texto_correcto,
--       temas? } — texto_correcto es la clave de calificación, enviada
--       al cliente igual que en el resto de los tipos (esta app no
--       oculta claves de calificación en ningún tipo). Respuesta:
--       { texto_reescrito }. Nueva librería
--       src/lib/comparar-ortografia.ts: tokeniza ambos textos por
--       espacios, compara posición por posición (recortando puntuación
--       de borde antes de comparar — la puntuación no es lo que se
--       evalúa aquí), cuenta errores, `aprobado = errores <= 5` (tal
--       cual lo pidió la usuaria), `puntajeAuto` = % de posiciones
--       correctas (misma semántica que el resto de la app). Nuevo
--       componente corregir-ortografia.tsx, calcado del patrón de
--       bloqueo de clasificacion.tsx: texto original de solo lectura
--       (anti-copia), Textarea vacío (no pre-llenado, igual que
--       encontrar_corregir), y tras bloquear, reconstrucción palabra por
--       palabra coloreada verde/rojo con "(era: X)" en las incorrectas.
--       Wiring: TIPOS_CONSTRUIDOS/switch en actividad/[id]/page.tsx,
--       ícono SpellCheck en tipo-actividad-icono.ts, caso nuevo en
--       resumen-respuesta.ts (si no, la ficha del estudiante en el panel
--       docente mostraría el JSON crudo — gap real encontrado al
--       revisar ese archivo), nueva sección de autoría en
--       actividad-form.tsx (con vista previa en vivo de cuántas
--       diferencias hay entre ambos textos), tipo insertado en
--       tipos_actividad.
--     - **Unidad 2 rediseñada de nuevo: SOLO ortografía**. La usuaria
--       fue explícita: nada de ¿? ¡! comillas/paréntesis/raya — eso es
--       puntuación, no ortografía. Las 4 actividades (mismos ids:
--       df9b1096, aaadbd59, 719397f7, 02e9a559) cambian de
--       etiquetado_texto a corregir_ortografia, progresión por tema:
--       "Mayúsculas y minúsculas" (6 errores) → "+ Acentuación" (8
--       errores, incluye la diacrítica el/él) → "+ Letras que se
--       confunden" (12 errores: b/v, s/z, g/j, h) → "Repaso integrador
--       de ortografía" (19 errores, junta las tres categorías) — todos
--       verificados por consulta SQL simulando la comparación palabra
--       por palabra antes de probar en vivo, y confirmando que ambos
--       textos de cada par tienen el mismo número de palabras (71/71,
--       40/40, 46/46, 61/61).
--     - **Video al inicio de cada actividad, restaurado para todas**:
--       video-intro.tsx acepta `videoUrl: string | null`; cuando es
--       null, muestra el EmptyState "Video próximamente" (reutilizado
--       de evaluar-videos.tsx) en vez de saltarse el paso — revierte
--       parcialmente la Fase R de esta sesión, que había quitado ese
--       placeholder (Fase H, ronda anterior a esta sesión, ya lo había
--       resuelto una vez). actividad/[id]/page.tsx ya no condiciona el
--       wrap en VideoIntro a que exista video_url, solo a `!entregaExistente`.
--       Ahora mismo ninguna de las 23 actividades tiene video_url — el
--       placeholder aparece consistentemente en las 23 hasta que la
--       docente suba videos reales.
--     - **Navegación entre actividades**: indicador "X de Y" con
--       flechas anterior/siguiente en el `accion` de PageHeader,
--       siempre visible (no solo tras entregar, a diferencia del botón
--       "Siguiente actividad" existente) — calculado de la consulta
--       `hermanas` ya existente, sin consulta nueva.
--     - **Aprendizajes Esperados tomados del programa oficial**: la
--       usuaria compartió el documento oficial de la Unidad de
--       Aprendizaje ("Expresión Oral y Escrita I", IPN NMS). Se
--       auditaron los `aprendizaje_esperado` de las 23 actividades
--       contra los 9 AE reales del programa (3 por unidad) — la mayoría
--       YA coincidía textualmente con el original (de fases anteriores
--       a esta sesión). Se corrigieron 2 que no coincidían: "Identifica
--       el modelo expositivo" tenía un AE completamente inventado →
--       ahora usa el AE2.3 real ("Valora la estructura de los textos de
--       divulgación..."); "Cualidades internas y externas..." tenía el
--       AE3.1 real con una oración añadida de más → se dejó el AE3.1
--       exacto del programa. Los 4 de ortografía nuevos usan el AE2.2
--       real ("Distingue diversas estructuras de oraciones..."). Se
--       verificó también que los 3 `unidad_competencia` (uno por
--       unidad) ya coinciden exactamente con la sección "Programa
--       Sintético" del documento oficial — sin cambios ahí.
--     - Verificado en vivo con estudiante QA temporal (sesión cerrada
--       explícitamente antes y después): actividad 1 con texto
--       perfectamente corregido dio 100% (0 errores de 71 palabras);
--       actividad 2 con una corrección parcial (3 de 8 errores dejados
--       a propósito) dio "3 errores de 40 palabras — dentro del máximo
--       aceptable (5)" y 93%, con el texto reconstruido mostrando
--       "(era: camión)", "(era: Pensó)", "(era: él)" junto a cada
--       palabra incorrecta — confirma que la tolerancia de 5 errores y
--       la calificación parcial funcionan juntas correctamente. El
--       placeholder de video y el indicador "X de Y" aparecieron
--       correctamente en la misma prueba. Typecheck y build limpios.
--       Datos de prueba limpiados.
