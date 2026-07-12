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
