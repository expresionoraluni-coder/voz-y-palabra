import { requerirAdministrador } from "@/lib/supabase/requerir-administrador";
import { createAdminClient } from "@/lib/supabase/admin";
import { revisarErrorConsulta } from "@/lib/revisar-error-consulta";
import { CATEGORIAS_REPORTE, type CategoriaReporte } from "@/lib/reportes-constantes";
import BandejaReportes from "./bandeja-reportes";

const TAMANO_PAGINA = 50;
const ESTADOS = new Set(["recibido", "en_revision", "necesita_informacion", "resuelto", "cerrado"]);
const PRIORIDADES = new Set(["baja", "normal", "alta", "urgente"]);
const TIPOS = new Set(["estudiante", "docente"]);
const CATEGORIAS: Set<string> = new Set(CATEGORIAS_REPORTE.map(([valor]) => valor));

type Reporte = {
  id: string;
  reportante_tipo: "estudiante" | "docente";
  estudiante_id: string | null;
  docente_id: string | null;
  grupo_id: string | null;
  unidad_id: string | null;
  actividad_id: string | null;
  categoria: string;
  descripcion: string;
  estado: string;
  prioridad: string;
  ruta: string | null;
  contexto: Record<string, unknown>;
  respuesta_publica: string | null;
  resolucion: string | null;
  asignado_a: string | null;
  asignado_en: string | null;
  fecha_limite: string | null;
  created_at: string;
  updated_at: string;
};

type EventoReporte = {
  id: string;
  reporte_id: string;
  actor_nombre: string;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  prioridad_anterior: string | null;
  prioridad_nueva: string | null;
  resolucion_anterior: string | null;
  resolucion_nueva: string | null;
  respuesta_publica_anterior: string | null;
  respuesta_publica_nueva: string | null;
  asignado_anterior: string | null;
  asignado_nuevo: string | null;
  creado_en: string;
};

type MensajeReporte = {
  id: string;
  reporte_id: string;
  autor_id: string;
  autor_tipo: "reportante" | "administrador";
  mensaje: string;
  creado_en: string;
};

type ParametrosBusqueda = Promise<{ [key: string]: string | string[] | undefined }>;

function primerParametro(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] ?? "" : valor ?? "";
}

function obtenerAntiguedad(createdAt: string) {
  const horas = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 3_600_000));
  return horas >= 24 ? `Hace ${Math.floor(horas / 24)} d` : horas > 0 ? `Hace ${horas} h` : "Hace un momento";
}

function limpiarBusqueda(valor: string) {
  return valor
    .replace(/[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ _-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export default async function AdminReportes({ searchParams }: { searchParams: ParametrosBusqueda }) {
  const { supabase, user } = await requerirAdministrador();
  const adminDb = createAdminClient();
  const parametros = await searchParams;
  const estadoParametro = primerParametro(parametros.estado);
  const prioridadParametro = primerParametro(parametros.prioridad);
  const tipoParametro = primerParametro(parametros.tipo);
  const categoriaParametro = primerParametro(parametros.categoria);
  const busqueda = limpiarBusqueda(primerParametro(parametros.q));
  const paginaSolicitada = Number.parseInt(primerParametro(parametros.pagina), 10);
  const pagina = Number.isFinite(paginaSolicitada) && paginaSolicitada > 0 ? paginaSolicitada : 1;
  const estado = ESTADOS.has(estadoParametro) ? estadoParametro : "";
  const prioridad = PRIORIDADES.has(prioridadParametro) ? prioridadParametro : "";
  const tipo = TIPOS.has(tipoParametro) ? tipoParametro : "";
  const categoria = CATEGORIAS.has(categoriaParametro) ? (categoriaParametro as CategoriaReporte) : "";

  const idsBusqueda = busqueda
    ? await Promise.all([
        adminDb.from("estudiantes").select("id").ilike("nombre", `%${busqueda}%`).limit(100),
        supabase.from("docentes").select("id").ilike("nombre", `%${busqueda}%`).limit(100),
        supabase.from("grupos").select("id").ilike("nombre", `%${busqueda}%`).limit(100),
        supabase.from("unidades").select("id").ilike("nombre", `%${busqueda}%`).limit(100),
        supabase.from("actividades").select("id").ilike("titulo", `%${busqueda}%`).limit(100),
      ])
    : null;

  const [estudiantesBusqueda, docentesBusqueda, gruposBusqueda, unidadesBusqueda, actividadesBusqueda] = idsBusqueda ?? [];
  revisarErrorConsulta(estudiantesBusqueda?.error ?? null, "No pudimos preparar la búsqueda de estudiantes.");
  revisarErrorConsulta(docentesBusqueda?.error ?? null, "No pudimos preparar la búsqueda de docentes.");
  revisarErrorConsulta(gruposBusqueda?.error ?? null, "No pudimos preparar la búsqueda de grupos.");
  revisarErrorConsulta(unidadesBusqueda?.error ?? null, "No pudimos preparar la búsqueda de unidades.");
  revisarErrorConsulta(actividadesBusqueda?.error ?? null, "No pudimos preparar la búsqueda de actividades.");

  const clausulasBusqueda = busqueda
    ? [
        `descripcion.ilike.*${busqueda}*`,
        `ruta.ilike.*${busqueda}*`,
        ...(estudiantesBusqueda?.data ?? []).map(({ id }) => `estudiante_id.eq.${id}`),
        ...(docentesBusqueda?.data ?? []).map(({ id }) => `docente_id.eq.${id}`),
        ...(gruposBusqueda?.data ?? []).map(({ id }) => `grupo_id.eq.${id}`),
        ...(unidadesBusqueda?.data ?? []).map(({ id }) => `unidad_id.eq.${id}`),
        ...(actividadesBusqueda?.data ?? []).map(({ id }) => `actividad_id.eq.${id}`),
      ].join(",")
    : "";

  let consulta = adminDb
    .from("reportes")
    .select("id, reportante_tipo, estudiante_id, docente_id, grupo_id, unidad_id, actividad_id, categoria, descripcion, estado, prioridad, ruta, contexto, respuesta_publica, resolucion, asignado_a, asignado_en, fecha_limite, created_at, updated_at", { count: "exact" })
    .order("fecha_limite", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range((pagina - 1) * TAMANO_PAGINA, pagina * TAMANO_PAGINA - 1);

  if (estado) consulta = consulta.eq("estado", estado);
  if (prioridad) consulta = consulta.eq("prioridad", prioridad);
  if (tipo) consulta = consulta.eq("reportante_tipo", tipo);
  if (categoria) consulta = consulta.eq("categoria", categoria);
  if (clausulasBusqueda) consulta = consulta.or(clausulasBusqueda);

  const { data: reportes, error: reportesError, count } = await consulta;
  revisarErrorConsulta(reportesError, "No pudimos cargar la bandeja de reportes.");

  const reportesCargados = (reportes ?? []) as Reporte[];
  const grupoIds = [...new Set(reportesCargados.map((reporte) => reporte.grupo_id).filter((id): id is string => Boolean(id)))];
  const estudianteIds = [...new Set(reportesCargados.map((reporte) => reporte.estudiante_id).filter((id): id is string => Boolean(id)))];
  const docenteIds = [...new Set(reportesCargados.map((reporte) => reporte.docente_id).filter((id): id is string => Boolean(id)))];
  const unidadIds = [...new Set(reportesCargados.map((reporte) => reporte.unidad_id).filter((id): id is string => Boolean(id)))];
  const actividadIds = [...new Set(reportesCargados.map((reporte) => reporte.actividad_id).filter((id): id is string => Boolean(id)))];

  const [gruposResultado, estudiantesResultado, docentesResultado, unidadesResultado, actividadesResultado] = await Promise.all([
    grupoIds.length ? supabase.from("grupos").select("id, nombre").in("id", grupoIds) : Promise.resolve({ data: [], error: null }),
    estudianteIds.length ? adminDb.from("estudiantes").select("id, nombre").in("id", estudianteIds) : Promise.resolve({ data: [], error: null }),
    docenteIds.length ? supabase.from("docentes").select("id, nombre").in("id", docenteIds) : Promise.resolve({ data: [], error: null }),
    unidadIds.length ? supabase.from("unidades").select("id, nombre").in("id", unidadIds) : Promise.resolve({ data: [], error: null }),
    actividadIds.length ? supabase.from("actividades").select("id, titulo").in("id", actividadIds) : Promise.resolve({ data: [], error: null }),
  ]);

  const { data: grupos, error: gruposError } = gruposResultado;
  const { data: estudiantes, error: estudiantesError } = estudiantesResultado;
  const { data: docentes, error: docentesError } = docentesResultado;
  const { data: unidades, error: unidadesError } = unidadesResultado;
  const { data: actividades, error: actividadesError } = actividadesResultado;

  revisarErrorConsulta(gruposError, "No pudimos cargar los nombres de los grupos.");
  revisarErrorConsulta(estudiantesError, "No pudimos cargar los nombres de estudiantes.");
  revisarErrorConsulta(docentesError, "No pudimos cargar los nombres de docentes.");
  revisarErrorConsulta(unidadesError, "No pudimos cargar los nombres de las unidades.");
  revisarErrorConsulta(actividadesError, "No pudimos cargar los nombres de las actividades.");

  const gruposMapa = new Map((grupos ?? []).map((grupo) => [grupo.id, grupo.nombre]));
  const estudiantesMapa = new Map((estudiantes ?? []).map((estudiante) => [estudiante.id, estudiante.nombre]));
  const docentesMapa = new Map((docentes ?? []).map((docente) => [docente.id, docente.nombre]));
  const unidadesMapa = new Map((unidades ?? []).map((unidad) => [unidad.id, unidad.nombre]));
  const actividadesMapa = new Map((actividades ?? []).map((actividad) => [actividad.id, actividad.titulo]));
  const reporteIds = reportesCargados.map((reporte) => reporte.id);
  const { data: eventos, error: eventosError } = reporteIds.length
    ? await supabase
        .from("reporte_eventos")
        .select("id, reporte_id, actor_nombre, estado_anterior, estado_nuevo, prioridad_anterior, prioridad_nueva, resolucion_anterior, resolucion_nueva, creado_en")
        .in("reporte_id", reporteIds)
        .order("creado_en", { ascending: false })
    : { data: [], error: null };
  revisarErrorConsulta(eventosError, "No pudimos cargar el historial de atención.");
  const { data: mensajes, error: mensajesError } = reporteIds.length
    ? await supabase
        .from("reporte_mensajes")
        .select("id, reporte_id, autor_id, autor_tipo, mensaje, creado_en")
        .in("reporte_id", reporteIds)
        .order("creado_en", { ascending: true })
    : { data: [], error: null };
  revisarErrorConsulta(mensajesError, "No pudimos cargar la conversación de los reportes.");
  const eventosMapa = new Map<string, EventoReporte[]>();
  for (const evento of (eventos ?? []) as EventoReporte[]) {
    const anteriores = eventosMapa.get(evento.reporte_id) ?? [];
    anteriores.push(evento);
    eventosMapa.set(evento.reporte_id, anteriores);
  }
  const mensajesMapa = new Map<string, MensajeReporte[]>();
  for (const mensaje of (mensajes ?? []) as MensajeReporte[]) {
    const anteriores = mensajesMapa.get(mensaje.reporte_id) ?? [];
    anteriores.push(mensaje);
    mensajesMapa.set(mensaje.reporte_id, anteriores);
  }
  const total = count ?? 0;
  const paginas = Math.max(1, Math.ceil(total / TAMANO_PAGINA));
  const paginaVisible = Math.min(pagina, paginas);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Atención</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Reportes de estudiantes y docentes</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Tú atiendes todos los casos. Cambiar el estado o escribir una resolución no modifica las respuestas ni el avance del estudiante. La bandeja se carga por páginas para conservar un tiempo de respuesta estable.
        </p>
      </section>

      <BandejaReportes
        reportes={reportesCargados.map((reporte) => ({ ...reporte, antiguedad: obtenerAntiguedad(reporte.created_at) }))}
        grupos={gruposMapa}
        estudiantes={estudiantesMapa}
        docentes={docentesMapa}
        unidades={unidadesMapa}
        actividades={actividadesMapa}
        eventos={eventosMapa}
        mensajes={mensajesMapa}
        administradorId={user.id}
        total={total}
        pagina={paginaVisible}
        paginas={paginas}
        filtrosIniciales={{ estado, prioridad, tipo, categoria, busqueda }}
      />
    </div>
  );
}
