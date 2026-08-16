import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { performance } from "node:perf_hooks";
import { randomUUID } from "node:crypto";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), false, { info: () => {}, error: () => {} });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error("Faltan variables de entorno necesarias para la prueba de carga.");
}

const TOTAL_GROUPS = 2;
const STUDENTS_PER_GROUP = 50;
const TOTAL_STUDENTS = TOTAL_GROUPS * STUDENTS_PER_GROUP;
const PREFIX = `E2E-CARGA-${Date.now()}`;
const NIP = "2026";
const DB_ONLY = process.env.E2E_DB_ONLY === "1";

const admin = createClient(URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const samples = new Map();
const failures = [];
const authUsers = new Set();
const students = [];
const groups = [];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error) {
  return error?.message ?? String(error ?? "Error desconocido");
}

async function measure(label, operation) {
  const started = performance.now();
  try {
    const result = await operation();
    if (result?.error) throw new Error(errorMessage(result.error));
    const ms = performance.now() - started;
    const list = samples.get(label) ?? [];
    list.push({ ms, ok: true });
    samples.set(label, list);
    return result;
  } catch (error) {
    const ms = performance.now() - started;
    const list = samples.get(label) ?? [];
    list.push({ ms, ok: false });
    samples.set(label, list);
    failures.push({ label, error: errorMessage(error) });
    throw error;
  }
}

function assertData(data, error, message) {
  if (error) throw new Error(`${message}: ${errorMessage(error)}`);
  return data;
}

function clientForStudent() {
  return createClient(URL, ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function respuestaAutomatica(student, unidad, actividad, puntaje) {
  return {
    e2e: true,
    simulacion: PREFIX,
    estudiante: student.numero,
    unidad,
    actividad: actividad.orden,
    puntajeSolicitado: puntaje,
  };
}

function respuestaAbierta(student, unidad, actividad) {
  return {
    e2e: true,
    simulacion: PREFIX,
    estudiante: student.numero,
    unidad,
    actividad: actividad.orden,
    texto: "Esta respuesta de prueba explica la idea principal y relaciona el contenido con una situación comunicativa.",
    checklist_marcado: [true, true, true],
  };
}

function sortBy(values, key) {
  return values.slice().sort((a, b) => a[key] - b[key]);
}

function percentile(values, fraction) {
  if (values.length === 0) return null;
  const ordered = sortBy(values, "ms");
  const index = Math.min(ordered.length - 1, Math.max(0, Math.ceil(ordered.length * fraction) - 1));
  return Number(ordered[index].ms.toFixed(1));
}

function summarizeMetrics() {
  return Object.fromEntries(
    [...samples.entries()].map(([label, values]) => {
      const ok = values.filter((value) => value.ok);
      const latencies = ok.map((value) => value.ms);
      return [
        label,
        {
          solicitudes: values.length,
          exitosas: ok.length,
          errores: values.length - ok.length,
          promedioMs: latencies.length
            ? Number((latencies.reduce((total, value) => total + value, 0) / latencies.length).toFixed(1))
            : null,
          p50Ms: percentile(ok, 0.5),
          p95Ms: percentile(ok, 0.95),
          maxMs: latencies.length ? Number(Math.max(...latencies).toFixed(1)) : null,
        },
      ];
    }),
  );
}

async function crearDatosTemporales() {
  const { data: docente, error: docenteError } = await admin.from("docentes").select("id").limit(1).maybeSingle();
  assertData(docente, docenteError, "No encontramos una docente de prueba");

  for (let groupIndex = 0; groupIndex < TOTAL_GROUPS; groupIndex += 1) {
    const { data: group, error: groupError } = await admin
      .from("grupos")
      .insert({
        nombre: `${PREFIX} Grupo ${groupIndex + 1}`,
        codigo_acceso: `${PREFIX}-${groupIndex + 1}`,
        docente_id: docente.id,
        ciclo_escolar: "Prueba de carga",
        activo: true,
      })
      .select("id, codigo_acceso")
      .single();
    assertData(group, groupError, "No pudimos crear el grupo temporal");
    groups.push(group);

    const rows = Array.from({ length: STUDENTS_PER_GROUP }, (_, index) => {
      const numero = groupIndex * STUDENTS_PER_GROUP + index + 1;
      return {
        id: randomUUID(),
        nombre: `${PREFIX} ESTUDIANTE ${String(numero).padStart(3, "0")}`,
        grupo_id: group.id,
        boleta: `E${String(numero).padStart(7, "0")}`,
        nip_hash: null,
        debe_cambiar_nip: false,
        activo: true,
      };
    });
    const studentRows = [];
    for (const row of rows) {
      if (DB_ONLY) {
        studentRows.push(row);
        continue;
      }
      const numero = groupIndex * STUDENTS_PER_GROUP + studentRows.length + 1;
      const email = `${PREFIX.toLowerCase()}-${String(numero).padStart(3, "0")}@example.invalid`;
      const password = `E2eCarga-2026-${String(numero).padStart(3, "0")}!`;
      const { data: authUser, error: authError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (authError || !authUser.user) throw new Error(`No pudimos crear la sesión sintética: ${errorMessage(authError)}`);
      authUsers.add(authUser.user.id);
      studentRows.push({ ...row, auth_user_id: authUser.user.id, email, password });
    }
    const insertRows = studentRows.map((row) => {
      const dbRow = { ...row };
      delete dbRow.email;
      delete dbRow.password;
      return dbRow;
    });
    const { error: studentError } = await admin.from("estudiantes").insert(insertRows);
    assertData(true, studentError, "No pudimos crear estudiantes temporales");
    students.push(...studentRows.map((row, index) => ({ ...row, numero: groupIndex * STUDENTS_PER_GROUP + index + 1, codigo: group.codigo_acceso })));
  }
}

async function cargarContenido() {
  const { data, error } = await admin
    .from("actividades")
    .select("id, unidad_id, orden, tipos_actividad(nombre), unidades(orden)")
    .order("unidad_id")
    .order("orden");
  assertData(data, error, "No pudimos cargar las actividades");

  const actividades = data.map((actividad) => ({
    ...actividad,
    tipo: Array.isArray(actividad.tipos_actividad) ? actividad.tipos_actividad[0]?.nombre : actividad.tipos_actividad?.nombre,
    unidad: Number(Array.isArray(actividad.unidades) ? actividad.unidades[0]?.orden : actividad.unidades?.orden),
  }));
  const porUnidad = new Map();
  for (const actividad of actividades) {
    const lista = porUnidad.get(actividad.unidad) ?? [];
    lista.push(actividad);
    porUnidad.set(actividad.unidad, lista);
  }
  return [...porUnidad.entries()].sort(([a], [b]) => a - b).map(([orden, lista]) => ({ orden, actividades: lista.sort((a, b) => a.orden - b.orden) }));
}

async function guardarEntrega(student, actividad, puntaje, intento) {
  const unidad = actividad.unidad;
  if (actividad.tipo === "redaccion_checklist") {
    const { error } = await measure("entrega_abierta", () =>
      admin.from("entregas").upsert(
        {
          estudiante_id: student.id,
          actividad_id: actividad.id,
          respuesta: respuestaAbierta(student, unidad, actividad),
          estado: "completada",
          puntaje_auto: null,
        },
        { onConflict: "estudiante_id,actividad_id" },
      ),
    );
    if (error) throw new Error(`Entrega abierta: ${errorMessage(error)}`);
    return;
  }

  const base = 78 + ((student.numero * 11 + actividad.orden * 7) % 23);
  const score = intento === 1 && student.numero % 10 === 0 ? 45 : base;
  const { data, error } = await measure("entrega_automatica", () =>
    admin.rpc("guardar_entrega_auto", {
      p_estudiante_id: student.id,
      p_actividad_id: actividad.id,
      p_respuesta: respuestaAutomatica(student, unidad, actividad, score),
      p_puntaje_auto: score,
      p_estado: "completada",
    }),
  );
  if (error) throw new Error(`Entrega automática: ${errorMessage(error)}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("La función de entrega automática no devolvió resultado");
}

async function guardarReflexionActividad(student, actividad, client) {
  const { error } = await measure("reflexion_actividad", () =>
    client.from("reflexiones").upsert(
      {
        estudiante_id: student.id,
        actividad_id: actividad.id,
        momento: "cierre",
        texto: `Reflexión de prueba ${PREFIX}: revisé la actividad ${actividad.orden} y relacioné la idea con el ejemplo.`,
      },
      { onConflict: "estudiante_id,actividad_id,momento" },
    ),
  );
  if (error) throw new Error(`Reflexión de actividad: ${errorMessage(error)}`);
}

async function trabajarEstudiante(student, unidades) {
  await sleep((student.numero % 25) * 80 + (student.numero > STUDENTS_PER_GROUP ? 250 : 0));
  const client = DB_ONLY ? admin : clientForStudent();

  if (!DB_ONLY) {
    const { data: authData, error: authError } = await measure("auth_sesión", () =>
      client.auth.signInWithPassword({ email: student.email, password: student.password }),
    );
    if (authError || !authData?.user?.id) throw new Error(`Auth de prueba: ${errorMessage(authError)}`);

    const { data: ingreso, error: ingresoError } = await measure("ingresar_estudiante", () =>
      client.rpc("ingresar_estudiante", {
        p_codigo: student.codigo,
        p_nombre: student.nombre,
        p_nip: NIP,
      }),
    );
    if (ingresoError) throw new Error(`Ingreso: ${errorMessage(ingresoError)}`);
    const filaIngreso = Array.isArray(ingreso) ? ingreso[0] : ingreso;
    if (!filaIngreso?.id || filaIngreso.id !== student.id || filaIngreso.error) {
      throw new Error(`Ingreso no vinculó al estudiante temporal (${filaIngreso?.error ?? "sin fila"})`);
    }
  }

  for (const unidad of unidades) {
    await sleep(25 + ((student.numero * unidad.orden) % 70));
    const { error: confianzaInicioError } = await measure("confianza_inicio", () =>
      client.from("autoevaluaciones_confianza").upsert(
        { estudiante_id: student.id, unidad_id: unidad.actividades[0].unidad_id, momento: "inicio", valor: 45 + ((student.numero * 3) % 50) },
        { onConflict: "estudiante_id,unidad_id,momento" },
      ),
    );
    if (confianzaInicioError) throw new Error(`Confianza inicial: ${errorMessage(confianzaInicioError)}`);

    const { error: bitacoraError } = await measure("bitacora", () =>
      client.from("bitacora").upsert(
        { estudiante_id: student.id, unidad_id: unidad.actividades[0].unidad_id, meta: `Meta de prueba ${PREFIX} para la unidad ${unidad.orden}`, cumplida: true },
        { onConflict: "estudiante_id,unidad_id" },
      ),
    );
    if (bitacoraError) throw new Error(`Bitácora: ${errorMessage(bitacoraError)}`);

    for (const actividad of unidad.actividades) {
      await sleep(20 + ((student.numero * 13 + actividad.orden * 17) % 100));
      await guardarEntrega(student, actividad, null, 1);
      if (actividad.tipo !== "redaccion_checklist" && student.numero % 10 === 0) {
        await sleep(30 + (student.numero % 80));
        await guardarEntrega(student, actividad, null, 2);
      }
      await guardarReflexionActividad(student, actividad, client);
    }

    const unidadId = unidad.actividades[0].unidad_id;
    const { error: confianzaCierreError } = await measure("confianza_cierre", () =>
      client.from("autoevaluaciones_confianza").upsert(
        { estudiante_id: student.id, unidad_id: unidadId, momento: "cierre", valor: 70 + ((student.numero + unidad.orden) % 26) },
        { onConflict: "estudiante_id,unidad_id,momento" },
      ),
    );
    if (confianzaCierreError) throw new Error(`Confianza de cierre: ${errorMessage(confianzaCierreError)}`);

    const { error: reflexionUnidadError } = await measure("reflexion_unidad", () =>
      client.from("reflexiones").upsert(
        { estudiante_id: student.id, unidad_id: unidadId, momento: "cierre", texto: `Cierre de prueba ${PREFIX}: aprendí a organizar y revisar mis ideas.` },
        { onConflict: "estudiante_id,unidad_id,momento" },
      ),
    );
    if (reflexionUnidadError) throw new Error(`Reflexión de unidad: ${errorMessage(reflexionUnidadError)}`);

    if (!DB_ONLY) {
      const { error: insigniasError } = await measure("verificar_insignias", () => client.rpc("verificar_insignias"));
      if (insigniasError) throw new Error(`Insignias: ${errorMessage(insigniasError)}`);
    }
  }

  const { error: verifyDeliveriesError } = await measure("verificación_estudiante", () =>
    client.from("entregas").select("actividad_id,puntaje_auto,respuesta").eq("estudiante_id", student.id),
  );
  if (verifyDeliveriesError) throw new Error(`Verificación de entregas: ${errorMessage(verifyDeliveriesError)}`);
  if (!DB_ONLY) {
    const { error: signOutError } = await measure("cerrar_sesión", () => client.auth.signOut());
    if (signOutError) throw new Error(`Cerrar sesión: ${errorMessage(signOutError)}`);
  }
  return student.id;
}

async function verificarDatos(unidades) {
  const groupIds = groups.map((group) => group.id);
  const { data: groupCounts, error: groupError } = await admin
    .from("estudiantes")
    .select("grupo_id")
    .in("grupo_id", groupIds);
  assertData(groupCounts, groupError, "No pudimos verificar los estudiantes");

  const studentIds = students.map((student) => student.id);
  const [deliveries, reflections, confidence, bitacora] = await Promise.all([
    admin.from("entregas").select("id", { count: "exact", head: true }).in("estudiante_id", studentIds),
    admin.from("reflexiones").select("id", { count: "exact", head: true }).in("estudiante_id", studentIds),
    admin.from("autoevaluaciones_confianza").select("id", { count: "exact", head: true }).in("estudiante_id", studentIds),
    admin.from("bitacora").select("id", { count: "exact", head: true }).in("estudiante_id", studentIds),
  ]);
  for (const result of [deliveries, reflections, confidence, bitacora]) {
    if (result.error) throw new Error(`No pudimos verificar la consistencia: ${errorMessage(result.error)}`);
  }
  return {
    grupos: groups.length,
    estudiantesPorGrupo: groups.map((group) => groupCounts.filter((student) => student.grupo_id === group.id).length),
    estudiantesCompletados: students.length,
    actividadesPorUnidad: unidades.map((unidad) => unidad.actividades.length),
    entregas: deliveries.count ?? 0,
    reflexiones: reflections.count ?? 0,
    confianzas: confidence.count ?? 0,
    bitacoras: bitacora.count ?? 0,
  };
}

async function limpiarDatos() {
  const groupIds = groups.map((group) => group.id);
  if (groupIds.length) {
    const { error } = await admin.from("grupos").delete().in("id", groupIds);
    if (error) throw new Error(`No pudimos eliminar los grupos temporales: ${errorMessage(error)}`);
  }
  for (const userId of authUsers) {
    const { error } = await admin.auth.admin.deleteUser(userId, true);
    if (error && !/not found|user not found/i.test(errorMessage(error))) {
      throw new Error(`No pudimos eliminar una sesión temporal: ${errorMessage(error)}`);
    }
  }
  const { data: leftover, error: leftoverError } = await admin.from("grupos").select("id").in("id", groupIds);
  if (leftoverError) throw new Error(`No pudimos comprobar la limpieza: ${errorMessage(leftoverError)}`);
  return { gruposTemporalesRestantes: leftover?.length ?? 0, sesionesTemporalesEliminadas: authUsers.size };
}

const startedAt = performance.now();
let verification = null;
let cleanup = null;
let completed = 0;

try {
  await crearDatosTemporales();
  const unidades = await cargarContenido();
  const results = await Promise.allSettled(students.map((student) => trabajarEstudiante(student, unidades)));
  completed = results.filter((result) => result.status === "fulfilled").length;
  for (const result of results) {
    if (result.status === "rejected") failures.push({ label: "estudiante", error: errorMessage(result.reason) });
  }
  verification = await verificarDatos(unidades);
} finally {
  cleanup = await limpiarDatos();
}

const wallMs = performance.now() - startedAt;
console.log(
  JSON.stringify(
    {
      prueba: "carga real aislada de Supabase",
      simulacion: DB_ONLY
        ? "2 grupos x 50 estudiantes, carga de base de datos escalonada en 3 unidades"
        : "2 grupos x 50 estudiantes, sesiones independientes, avance escalonado en 3 unidades",
      duracionTotalMs: Number(wallMs.toFixed(1)),
      estudiantes: {
        creados: TOTAL_STUDENTS,
        trayectoriasCompletadas: completed,
        sesionesCompletadas: DB_ONLY ? null : completed,
        errores: TOTAL_STUDENTS - completed,
      },
      consistenciaAntesDeLimpiar: verification,
      metricas: summarizeMetrics(),
      errores: failures.slice(0, 20),
      erroresRegistrados: failures.length,
      limpieza: cleanup,
    },
    null,
    2,
  ),
);

if (completed !== TOTAL_STUDENTS || failures.length > 0 || cleanup?.gruposTemporalesRestantes !== 0) {
  process.exitCode = 1;
}
