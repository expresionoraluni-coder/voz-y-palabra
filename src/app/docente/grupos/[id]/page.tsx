import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ClipboardCheck, TrendingDown, TrendingUp, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Avisos from "./avisos";
import Eventos from "./eventos";
import AccesoGrupo from "./acceso-grupo";
import EditarGrupo from "./editar-grupo";
import EliminarGrupo from "./eliminar-grupo";
import GrupoEstudiantesPanel from "./grupo-estudiantes-panel";
import PageHeader from "@/components/ui/page-header";
import { Card, CardLink } from "@/components/ui/card";
import MetricCard from "@/components/ui/metric-card";
import ProgressBar from "@/components/ui/progress-bar";
import Alert from "@/components/ui/alert";
import { temaUnidad } from "@/lib/unidad-tema";
import { revisarErrorConsulta } from "@/lib/revisar-error-consulta";

const DIAS_INACTIVIDAD = 10;

type AlertaDocente = {
  texto: string;
  estudianteId: string;
};

type ErrorDeConsultaLocal = { message?: string; code?: string } | null;

type EntregaResumenGrupo = {
  id: string;
  estudiante_id: string;
  actividad_id: string;
  estado: string | null;
  created_at: string;
  puntaje_auto: number | null;
  evaluacion_docente: string | null;
};

type EntregaConfusionGrupo = {
  id: string;
  estudiante_id: string;
  actividad_id: string;
  respuesta: unknown;
};

const TAMANO_PAGINA_ENTREGAS = 1000;

async function cargarEntregasPaginadas<T>(
  supabase: Awaited<ReturnType<typeof createClient>>,
  grupoId: string,
  select: string,
  actividadIds?: string[],
): Promise<{ data: T[]; error: ErrorDeConsultaLocal }> {
  const filas: T[] = [];

  for (let desde = 0; ; desde += TAMANO_PAGINA_ENTREGAS) {
    let consulta = supabase
      .from("entregas")
      .select(select)
      .eq("estudiantes.grupo_id", grupoId)
      .range(desde, desde + TAMANO_PAGINA_ENTREGAS - 1);

    if (actividadIds?.length) consulta = consulta.in("actividad_id", actividadIds);

    const { data, error } = await consulta;
    if (error) return { data: filas, error };

    const pagina = (data ?? []) as T[];
    filas.push(...pagina);
    if (pagina.length < TAMANO_PAGINA_ENTREGAS) break;
  }

  return { data: filas, error: null };
}

export default async function DetalleGrupo({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Ninguna de estas consultas depende de otra — todas filtran por el id de
  // la URL directamente, incluida entregas (antes esperaba a conocer los
  // ids de estudiantes de una consulta previa; ahora filtra con el mismo
  // join que ya usa su política RLS: estudiantes!inner(grupo_id)). RLS ya
  // protege cada tabla por docente_id, así que tampoco hace falta esperar
  // la confirmación de sesión antes de lanzar el resto. Antes eran hasta 4
  // viajes de ida y vuelta seguidos a Supabase; ahora son consultas paralelas
  // y la entrega se pagina solo cuando supera el límite de 1,000 filas. Así
  // el panel conserva los conteos completos sin descargar JSON innecesario.
  const [
    { data: { user }, error: sesionError },
    { data: grupo, error: grupoError },
    { data: estudiantesTodos, error: estudiantesError },
    { data: unidades, error: unidadesError },
    { data: actividades, error: actividadesError },
    { data: confianzas, error: confianzasError },
    { data: avisos, error: avisosError },
    { data: eventos, error: eventosError },
    { data: entregas, error: entregasError },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("grupos")
      .select("id, nombre, codigo_acceso, ciclo_escolar")
      .eq("id", id)
      .single(),
    supabase.from("estudiantes").select("id, nombre, created_at, activo").eq("grupo_id", id).order("nombre"),
    supabase.from("unidades").select("id, nombre, orden").order("orden"),
    supabase.from("actividades").select("id, unidad_id, titulo, tipos_actividad(nombre)"),
    supabase.from("autoevaluaciones_confianza").select("estudiante_id, unidad_id, momento, valor"),
    supabase
      .from("avisos")
      .select("id, titulo, mensaje, created_at")
      .eq("grupo_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("eventos").select("id, titulo, tipo, fecha, unidad_id").eq("grupo_id", id),
    cargarEntregasPaginadas<EntregaResumenGrupo>(
      supabase,
      id,
      "id, estudiante_id, actividad_id, estado, created_at, puntaje_auto, evaluacion_docente, estudiantes!inner(grupo_id)",
    ),
  ]);

  revisarErrorConsulta(sesionError, "No pudimos validar tu sesión docente.");
  revisarErrorConsulta(grupoError, "No pudimos cargar este grupo.");
  revisarErrorConsulta(estudiantesError, "No pudimos cargar la lista de estudiantes.");
  revisarErrorConsulta(unidadesError, "No pudimos cargar las unidades del curso.");
  revisarErrorConsulta(actividadesError, "No pudimos cargar las actividades del curso.");
  revisarErrorConsulta(confianzasError, "No pudimos cargar los niveles de seguridad.");
  revisarErrorConsulta(avisosError, "No pudimos cargar los avisos del grupo.");
  revisarErrorConsulta(eventosError, "No pudimos cargar los eventos del grupo.");
  revisarErrorConsulta(entregasError, "No pudimos cargar el avance del grupo.");

  if (!user) redirect("/ingreso/profesora");
  if (!grupo) notFound();

  // La tabla entregas puede contener respuestas JSON grandes. El panel solo
  // necesita ese JSON para la matriz de confusión de los dos tipos
  // autoevaluables; el resto de métricas usa únicamente el resumen anterior.
  // Así se evita descargar respuestas abiertas y textos largos en cada visita.
  const tiposConConfusion = new Set(["clasificacion", "etiquetado_texto"]);
  const actividadesMapa = new Map(
    (actividades ?? []).map((actividad) => {
      const tipo = Array.isArray(actividad.tipos_actividad)
        ? actividad.tipos_actividad[0]
        : actividad.tipos_actividad;
      const unidad = (unidades ?? []).find((item) => item.id === actividad.unidad_id);
      return [actividad.id, { titulo: actividad.titulo, tipo: tipo?.nombre ?? "otro", unidadOrden: unidad?.orden ?? null }];
    }),
  );
  const idsActividadesConConfusion = (actividades ?? [])
    .filter((actividad) => {
      const tipo = Array.isArray(actividad.tipos_actividad)
        ? actividad.tipos_actividad[0]
        : actividad.tipos_actividad;
      return tiposConConfusion.has(tipo?.nombre ?? "");
    })
    .map((actividad) => actividad.id);
  const { data: entregasConConfusion, error: entregasConConfusionError } = idsActividadesConConfusion.length
    ? await cargarEntregasPaginadas<EntregaConfusionGrupo>(
        supabase,
        id,
        "id, estudiante_id, actividad_id, respuesta, estudiantes!inner(grupo_id)",
        idsActividadesConConfusion,
      )
    : { data: [] as EntregaConfusionGrupo[], error: null };
  revisarErrorConsulta(entregasConConfusionError, "No pudimos cargar los datos para detectar dificultades comunes.");

  const estudiantes = (estudiantesTodos ?? []).filter((e) => e.activo);
  const estudiantesBaja = (estudiantesTodos ?? []).filter((e) => !e.activo);
  const totalActividades = actividades?.length ?? 0;
  const entregasSeguras = entregas ?? [];
  const entregasPorEstudiante = new Map<string, typeof entregasSeguras>();
  const entregasPorActividad = new Map<string, typeof entregasSeguras>();
  for (const entrega of entregasSeguras) {
    const delEstudiante = entregasPorEstudiante.get(entrega.estudiante_id) ?? [];
    delEstudiante.push(entrega);
    entregasPorEstudiante.set(entrega.estudiante_id, delEstudiante);
    const deLaActividad = entregasPorActividad.get(entrega.actividad_id) ?? [];
    deLaActividad.push(entrega);
    entregasPorActividad.set(entrega.actividad_id, deLaActividad);
  }
  // La actividad se mide respecto al momento en que se solicita el panel.
  // eslint-disable-next-line react-hooks/purity
  const hoy = Date.now();

  const porEstudiante = (estudiantes ?? []).map((e) => {
    const misEntregas = entregasPorEstudiante.get(e.id) ?? [];
    const avance = totalActividades > 0 ? Math.round((misEntregas.length / totalActividades) * 100) : 0;
    const fechas = misEntregas.map((en) => new Date(en.created_at).getTime());
    const ultima = fechas.length ? Math.max(...fechas) : null;
    const diasInactivo = ultima ? Math.floor((hoy - ultima) / (1000 * 60 * 60 * 24)) : null;
    const ultimaEntrega = misEntregas.reduce<typeof misEntregas[number] | null>(
      (actual, entrega) => (!actual || entrega.created_at > actual.created_at ? entrega : actual),
      null,
    );
    const actividadActual = ultimaEntrega ? actividadesMapa.get(ultimaEntrega.actividad_id) : null;
    return {
      ...e,
      avance: Math.min(100, avance),
      ultima,
      diasInactivo,
      totalEntregas: misEntregas.length,
      unidadActual: actividadActual?.unidadOrden ?? null,
      ultimaActividad: actividadActual?.titulo ?? null,
    };
  });
  const porEstudianteMap = new Map(porEstudiante.map((e) => [e.id, e]));

  const avancePromedio =
    porEstudiante.length > 0
      ? Math.round(porEstudiante.reduce((s, e) => s + e.avance, 0) / porEstudiante.length)
      : 0;
  const activosSemana = porEstudiante.filter((e) => e.diasInactivo !== null && e.diasInactivo <= 7).length;
  const sinEmpezar = porEstudiante.filter((e) => e.totalEntregas === 0).length;
  const sinActividadReciente = porEstudiante.filter((e) => e.diasInactivo !== null && e.diasInactivo > DIAS_INACTIVIDAD).length;
  // Más antigua primero: sin esto salían en el orden arbitrario en que las
  // devolvía Postgres, no en el orden en que conviene atenderlas.
  const entregasPorRevisar = (entregas ?? [])
    .filter((en) => en.estado === "pendiente_revision")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const avancePorUnidad = (unidades ?? []).map((u) => {
    const actsUnidad = (actividades ?? []).filter((a) => a.unidad_id === u.id);
    const totalPosible = actsUnidad.length * (estudiantes?.length ?? 0);
    const hechas = actsUnidad.reduce((total, a) => total + (entregasPorActividad.get(a.id)?.length ?? 0), 0);
    return {
      ...u,
      porcentaje: totalPosible > 0 ? Math.round((hechas / totalPosible) * 100) : 0,
    };
  });

  // Precisión promedio por tipo de actividad: solo los tipos con respuesta
  // objetivamente correcta guardan puntaje_auto (clasificación, etiquetado
  // de texto, opción-justificación, ordenar fragmentos, y comparador en
  // modo chips). Ordenado de peor a mejor para que salte a la vista dónde
  // intervenir.
  function nombreTipoDe(en: { actividad_id: string }) {
    return actividadesMapa.get(en.actividad_id)?.tipo ?? "otro";
  }

  const precisionPorTipoBase = Object.values(
    (entregas ?? [])
      .filter((en) => en.puntaje_auto !== null)
      .reduce(
        (acc, en) => {
          const nombre = nombreTipoDe(en);
          acc[nombre] ??= { nombre, suma: 0, total: 0 };
          acc[nombre].suma += en.puntaje_auto ?? 0;
          acc[nombre].total += 1;
          return acc;
        },
        {} as Record<string, { nombre: string; suma: number; total: number }>,
      ),
  )
    .map((x) => ({ nombre: x.nombre, promedio: Math.round(x.suma / x.total), n: x.total }))
    .sort((a, b) => a.promedio - b.promedio);

  // Tendencia de precisión por tipo: compara el promedio de puntaje_auto de
  // los últimos 7 días contra los 7 anteriores, calculado en vivo a partir
  // de las entregas ya cargadas. Va por tipo (no un solo número agregado)
  // porque dos tipos moviéndose en direcciones opuestas se cancelaban entre
  // sí y mostraban "igual que la semana pasada" sin serlo.
  const hace7dias = hoy - 7 * 24 * 60 * 60 * 1000;
  const hace14dias = hoy - 14 * 24 * 60 * 60 * 1000;
  const entregasSemanaActual = (entregas ?? []).filter(
    (en) => new Date(en.created_at).getTime() >= hace7dias,
  );
  const entregasSemanaAnterior = (entregas ?? []).filter((en) => {
    const t = new Date(en.created_at).getTime();
    return t >= hace14dias && t < hace7dias;
  });
  function promedioPuntajePorTipo(arr: typeof entregas, nombreTipo: string) {
    const conPuntaje = (arr ?? []).filter(
      (en) => en.puntaje_auto !== null && nombreTipoDe(en) === nombreTipo,
    );
    return conPuntaje.length > 0
      ? Math.round(conPuntaje.reduce((s, en) => s + (en.puntaje_auto ?? 0), 0) / conPuntaje.length)
      : null;
  }
  const precisionPorTipo = precisionPorTipoBase.map((t) => {
    const actual = promedioPuntajePorTipo(entregasSemanaActual, t.nombre);
    const anterior = promedioPuntajePorTipo(entregasSemanaAnterior, t.nombre);
    return {
      ...t,
      tendencia: actual !== null && anterior !== null ? actual - anterior : null,
    };
  });

  // Matriz de confusión por elemento: no solo "clasificación va al 69%",
  // sino "el grupo confunde 'Receptor' con 'Emisor' en 5 entregas" — mismo
  // dato ya guardado en respuesta.elegidas, solo que agregado más fino.
  const confusionMap = new Map<string, { elemento: string; correcta: string; elegida: string; veces: number }>();
  for (const en of entregasConConfusion ?? []) {
    const respuesta = en.respuesta as {
      elegidas?: string[];
      itemsSnapshot?: { texto: string; correcta: string }[];
    } | null;
    const elegidas = respuesta?.elegidas ?? [];

    // Las entregas actuales guardan un snapshot de los elementos evaluados.
    // Si una entrega histórica no lo tiene, se omite de esta métrica para no
    // traer el JSON completo de cada actividad solo como respaldo.
    const items = respuesta?.itemsSnapshot ?? [];

    items.forEach((item, i) => {
      const elegida = elegidas[i];
      if (!elegida || elegida === item.correcta) return;
      const key = `${item.texto}|||${elegida}`;
      const existente = confusionMap.get(key);
      if (existente) existente.veces += 1;
      else confusionMap.set(key, { elemento: item.texto, correcta: item.correcta, elegida, veces: 1 });
    });
  }
  const confusionesTop = [...confusionMap.values()].sort((a, b) => b.veces - a.veces).slice(0, 5);
  const totalConfusiones = [...confusionMap.values()].reduce((total, confusion) => total + confusion.veces, 0);

  const alertas: AlertaDocente[] = [];
  for (const e of porEstudiante) {
    if (e.totalEntregas === 0) {
      const diasDesdeAlta = Math.floor((hoy - new Date(e.created_at).getTime()) / (1000 * 60 * 60 * 24));
      if (diasDesdeAlta >= 3) alertas.push({ estudianteId: e.id, texto: `${e.nombre} todavía no ha empezado a practicar.` });
    } else if (e.diasInactivo !== null && e.diasInactivo > DIAS_INACTIVIDAD) {
      alertas.push({ estudianteId: e.id, texto: `${e.nombre} sin actividad hace ${e.diasInactivo} días.` });
    }
  }
  for (const c of confianzas ?? []) {
    if (c.momento !== "inicio") continue;
    const est = porEstudianteMap.get(c.estudiante_id);
    if (!est) continue;
    if (c.valor >= 70 && est.totalEntregas === 0) {
      alertas.push({ estudianteId: est.id, texto: `${est.nombre} dice sentirse seguro pero no ha completado actividades.` });
      continue;
    }
    if (c.valor >= 70 && est.totalEntregas > 0) {
      const misPuntajes = (entregasPorEstudiante.get(est.id) ?? []).filter((en) => en.puntaje_auto !== null);
      if (misPuntajes.length > 0) {
        const promedio = misPuntajes.reduce((s, en) => s + (en.puntaje_auto ?? 0), 0) / misPuntajes.length;
        if (promedio < 50) {
          alertas.push({
            estudianteId: est.id,
            texto: `${est.nombre} dice sentirse seguro pero su precisión real es de ${Math.round(promedio)}%.`,
          });
        }
      }
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <PageHeader
        volverHref="/docente/dashboard"
        titulo={grupo.nombre}
        descripcion={`${estudiantes?.length ?? 0} estudiantes activos · seguimiento del avance y señales de apoyo`}
        accion={<EditarGrupo grupoId={grupo.id} nombreActual={grupo.nombre} codigoActual={grupo.codigo_acceso} />}
      />

      <nav className="sticky top-0 z-10 -mx-6 flex gap-1 border-b border-slate-200 bg-slate-50/95 px-6 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        {[
          { href: "#resumen", etiqueta: "Resumen" },
          { href: "#atencion", etiqueta: "Atención" },
          { href: "#detalle", etiqueta: "Avance" },
          { href: "#avisos", etiqueta: "Avisos" },
          { href: "#estudiantes", etiqueta: "Estudiantes" },
        ].map((t) => (
          <a
            key={t.href}
            href={t.href}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
          >
            {t.etiqueta}
          </a>
        ))}
      </nav>

      <div id="resumen" className="scroll-mt-16 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard etiqueta="Avance promedio" valor={`${avancePromedio}%`} icon={TrendingUp} tono="indigo" />
        <MetricCard
          etiqueta="Activos esta semana"
          valor={`${activosSemana}/${estudiantes?.length ?? 0}`}
          icon={Users}
          tono="emerald"
        />
        <MetricCard
          etiqueta="Casos de apoyo"
          valor={entregasPorRevisar.length}
          icon={ClipboardCheck}
          tono="amber"
        />
        <MetricCard etiqueta="Estudiantes" valor={estudiantes?.length ?? 0} icon={Users} tono="slate" />
      </div>

      <section id="atencion" className="scroll-mt-16 flex flex-col gap-3" aria-labelledby="atencion-titulo">
        <div>
          <h2 id="atencion-titulo" className="text-lg font-semibold text-slate-900 dark:text-slate-50">Qué necesita atención</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Señales para decidir dónde mirar primero; no son calificaciones.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link href="#estudiantes">
            <CardLink className="flex h-full flex-col gap-2 border-amber-100 px-4 py-4 dark:border-amber-900/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Sin comenzar</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{sinEmpezar}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Abrir lista de estudiantes</p>
            </CardLink>
          </Link>
          <Link href="#estudiantes">
            <CardLink className="flex h-full flex-col gap-2 border-slate-200 px-4 py-4 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Sin actividad reciente</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{sinActividadReciente}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Más de {DIAS_INACTIVIDAD} días</p>
            </CardLink>
          </Link>
          <Link href="#apoyo">
            <CardLink className="flex h-full flex-col gap-2 border-indigo-100 px-4 py-4 dark:border-indigo-900/60">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Casos de apoyo</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{entregasPorRevisar.length}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Orientación opcional</p>
            </CardLink>
          </Link>
        </div>
      </section>

      <AccesoGrupo codigo={grupo.codigo_acceso} />

      {alertas.length > 0 && (
        <Alert tono="warning" titulo="Alertas">
          <ul className="flex flex-col gap-2">
            {alertas.map((a) => (
              <li key={`${a.estudianteId}-${a.texto}`} className="flex flex-wrap items-center justify-between gap-2">
                <span>{a.texto}</span>
                <Link
                  href={`/docente/estudiantes/${a.estudianteId}`}
                  className="inline-flex min-h-9 items-center rounded-lg px-2.5 text-xs font-semibold text-amber-800 underline decoration-amber-300 underline-offset-2 hover:text-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-200 dark:hover:text-amber-50"
                >
                  Ver perfil
                </Link>
              </li>
            ))}
          </ul>
        </Alert>
      )}

      <section id="detalle" className="scroll-mt-16 flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Avance por unidad</h2>
        <Card className="flex flex-col gap-4 p-5">
          {avancePorUnidad.map((u) => (
            <div key={u.id}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="text-slate-700 dark:text-slate-300">
                  Unidad {u.orden}. {u.nombre}
                </span>
                <span className="font-medium text-slate-900 dark:text-slate-50">{u.porcentaje}%</span>
              </div>
              <ProgressBar porcentaje={u.porcentaje} gradiente={temaUnidad(u.orden).barra} />
            </div>
          ))}
        </Card>
      </section>

      {precisionPorTipo.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Precisión por tipo de actividad
            </h2>
            <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
              vs. semana pasada, por tipo
            </span>
          </div>
          <Card className="flex flex-col gap-4 p-5">
            {precisionPorTipo.map((t) => (
              <div key={t.nombre}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="capitalize text-slate-700 dark:text-slate-300">
                    {t.nombre.replaceAll("_", " ")}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-50">
                    {t.tendencia !== null && t.tendencia !== 0 && (
                      <span
                        className={`flex items-center text-xs font-medium ${
                          t.tendencia > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {t.tendencia > 0 ? (
                          <TrendingUp className="size-3" aria-hidden="true" />
                        ) : (
                          <TrendingDown className="size-3" aria-hidden="true" />
                        )}
                        {t.tendencia > 0 ? "+" : ""}
                        {t.tendencia}
                      </span>
                    )}
                    {t.promedio}% · {t.n} {t.n === 1 ? "entrega" : "entregas"}
                  </span>
                </div>
                <ProgressBar
                  porcentaje={t.promedio}
                  gradiente={
                    t.promedio >= 70
                      ? "from-emerald-500 to-emerald-600"
                      : t.promedio >= 40
                        ? "from-amber-500 to-amber-600"
                        : "from-red-500 to-red-600"
                  }
                />
              </div>
            ))}
          </Card>
        </section>
      )}

      {confusionesTop.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Errores más frecuentes
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {totalConfusiones} respuestas incorrectas identificadas; ordenadas de mayor a menor frecuencia.
          </p>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                  <tr>
                    <th className="w-12 px-4 py-3 text-center">#</th>
                    <th className="px-4 py-3">Elemento</th>
                    <th className="px-4 py-3">Respuesta elegida</th>
                    <th className="px-4 py-3 text-right">Veces</th>
                    <th className="px-4 py-3 text-right">% del total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {confusionesTop.map((c, i) => (
              <tr key={i}>
                <td className="px-4 py-3 text-center font-semibold text-slate-400 dark:text-slate-500">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">{c.elemento}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                  {c.elegida} <span className="text-xs text-slate-400 dark:text-slate-500">(correcta: {c.correcta})</span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-amber-700 dark:text-amber-300">{c.veces}</td>
                <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">{Math.round((c.veces / totalConfusiones) * 100)}%</td>
              </tr>
            ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}

      <section id="apoyo" className="scroll-mt-16 flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Casos de apoyo para atender</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Orientaciones opcionales, no calificaciones.</p>
        </div>
        {entregasPorRevisar.length > 0 ? (
          <div className="flex flex-col gap-2">
            {entregasPorRevisar.map((en) => {
              const est = porEstudianteMap.get(en.estudiante_id);
              const act = actividadesMapa.get(en.actividad_id);
              return (
                <Link key={en.id} href={`/docente/estudiantes/${en.estudiante_id}#entrega-${en.id}`}>
                  <CardLink className="flex items-center gap-3 px-4 py-3">
                    <span className="size-2 shrink-0 rounded-full bg-amber-400" aria-hidden="true" />
                    <span className="flex-1 text-sm text-slate-900 dark:text-slate-50">
                      <strong className="font-medium">{est?.nombre}</strong> · {act?.titulo}
                    </span>
                    <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Abrir caso</span>
                  </CardLink>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">No hay casos pendientes en este momento.</Card>
        )}
      </section>

      <div id="avisos" className="scroll-mt-16 flex flex-col gap-8">
        <Eventos grupoId={grupo.id} unidades={unidades ?? []} eventos={eventos ?? []} />
        <Avisos grupoId={grupo.id} avisos={avisos ?? []} />
      </div>

      <div id="estudiantes" className="scroll-mt-16 flex flex-col gap-8">
        <GrupoEstudiantesPanel
          grupoId={grupo.id}
          nombreGrupo={grupo.nombre}
          estudiantes={porEstudiante}
          estudiantesBaja={estudiantesBaja ?? []}
          nombresExistentes={[...(estudiantes ?? []), ...(estudiantesBaja ?? [])].map((e) => e.nombre)}
        />

      <section className="flex flex-col gap-3 border-t border-slate-200 pt-6 dark:border-slate-800">
        <h2 className="text-sm font-medium text-slate-500 dark:text-slate-500">Zona de riesgo</h2>
        <EliminarGrupo
          grupoId={grupo.id}
          nombreGrupo={grupo.nombre}
          totalEstudiantes={(estudiantes?.length ?? 0) + (estudiantesBaja?.length ?? 0)}
        />
      </section>
      </div>
    </div>
  );
}
