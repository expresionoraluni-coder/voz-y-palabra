import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Activity, KeyRound, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Avisos from "./avisos";
import Eventos from "./eventos";
import AccesoGrupo from "./acceso-grupo";
import EditarGrupo from "./editar-grupo";
import EliminarGrupo from "./eliminar-grupo";
import GrupoEstudiantesPanel from "./grupo-estudiantes-panel";
import SeguimientoAprendizaje from "./seguimiento-aprendizaje";
import PageHeader from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import MetricCard from "@/components/ui/metric-card";
import ProgressBar from "@/components/ui/progress-bar";
import { temaUnidad } from "@/lib/unidad-tema";
import { revisarErrorConsulta } from "@/lib/revisar-error-consulta";
import { calcularAvanceDeActividadesAbiertas } from "@/lib/avance-actividades-abiertas";
import { casoCalibracion } from "@/lib/calibracion-confianza";
import type { ReflexionSeguimiento } from "./tipos-seguimiento";

const DIAS_INACTIVIDAD = 10;

type AlertaDocente = {
  tipo: "sin_comenzar" | "inactividad";
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
  respuesta: unknown;
};

type EntregaConfusionGrupo = {
  id: string;
  estudiante_id: string;
  actividad_id: string;
  respuesta: unknown;
};

const TAMANO_PAGINA_ENTREGAS = 1000;
const TAMANO_PAGINA_REFLEXIONES = 1000;

async function cargarEntregasPaginadas<T>(
  supabase: Awaited<ReturnType<typeof createClient>>,
  estudianteIds: string[],
  select: string,
  actividadIds?: string[],
): Promise<{ data: T[]; error: ErrorDeConsultaLocal }> {
  if (estudianteIds.length === 0) return { data: [], error: null };
  let conteo = supabase
    .from("entregas")
    .select("id", { count: "exact", head: true })
    .in("estudiante_id", estudianteIds);
  if (actividadIds?.length) conteo = conteo.in("actividad_id", actividadIds);
  const { count, error: conteoError } = await conteo;
  if (conteoError) return { data: [], error: conteoError };

  const paginas = Array.from({ length: Math.ceil((count ?? 0) / TAMANO_PAGINA_ENTREGAS) }, (_, indice) => indice * TAMANO_PAGINA_ENTREGAS);
  const resultados = await Promise.all(paginas.map(async (desde) => {
    let consulta = supabase
      .from("entregas")
      .select(select)
      .in("estudiante_id", estudianteIds)
      // La paginación necesita un orden estable para no duplicar u omitir
      // filas si una entrega entra mientras se recorren varias páginas.
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(desde, desde + TAMANO_PAGINA_ENTREGAS - 1);

    if (actividadIds?.length) consulta = consulta.in("actividad_id", actividadIds);

    const { data, error } = await consulta;
    return { data: (data ?? []) as T[], error };
  }));
  const resultadoConError = resultados.find((resultado) => resultado.error);
  if (resultadoConError?.error) return { data: [], error: resultadoConError.error };
  return { data: resultados.flatMap((resultado) => resultado.data), error: null };
}

async function cargarReflexionesPaginadas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  estudianteIds: string[],
): Promise<{ data: ReflexionSeguimiento[]; error: ErrorDeConsultaLocal }> {
  if (estudianteIds.length === 0) return { data: [], error: null };

  const { count, error: conteoError } = await supabase
    .from("reflexiones")
    .select("id", { count: "exact", head: true })
    .in("estudiante_id", estudianteIds);
  if (conteoError) return { data: [], error: conteoError };

  const paginas = Array.from({ length: Math.ceil((count ?? 0) / TAMANO_PAGINA_REFLEXIONES) }, (_, indice) => indice * TAMANO_PAGINA_REFLEXIONES);
  const resultados = await Promise.all(paginas.map(async (desde) => {
    const { data, error } = await supabase
      .from("reflexiones")
      .select("id, estudiante_id, actividad_id, unidad_id, texto, momento, confianza, created_at")
      .in("estudiante_id", estudianteIds)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(desde, desde + TAMANO_PAGINA_REFLEXIONES - 1);
    return { data: (data ?? []) as ReflexionSeguimiento[], error };
  }));
  const resultadoConError = resultados.find((resultado) => resultado.error);
  if (resultadoConError?.error) return { data: [], error: resultadoConError.error };
  return { data: resultados.flatMap((resultado) => resultado.data), error: null };
}

export default async function DetalleGrupo({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Estas consultas independientes se lanzan en paralelo. Las entregas se
  // cargan después de conocer los ids del grupo para no usar un embed de
  // estudiantes que exigiría privilegios de tabla completos y expondría más
  // columnas de las necesarias.
  const [
    { data: { user }, error: sesionError },
    { data: grupo, error: grupoError },
    { data: estudiantesTodos, error: estudiantesError },
    { data: unidades, error: unidadesError },
    { data: actividades, error: actividadesError },
    { data: avisos, error: avisosError },
    { data: eventos, error: eventosError },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("grupos")
      .select("id, nombre, codigo_acceso, ciclo_escolar")
      .eq("id", id)
      .single(),
    supabase
      .from("estudiantes")
      .select("id, nombre, created_at, activo, debe_cambiar_nip")
      .eq("grupo_id", id)
      .order("nombre"),
    supabase.from("unidades").select("id, nombre, orden").order("orden"),
    supabase.from("actividades").select("id, unidad_id, titulo, orden, contenido, tipos_actividad(nombre)").order("orden"),
    supabase
      .from("avisos")
      .select("id, titulo, mensaje, created_at")
      .eq("grupo_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("eventos").select("id, titulo, tipo, fecha, unidad_id, actividad_id").eq("grupo_id", id),
  ]);

  if (!user || user.is_anonymous === true) redirect("/ingreso/profesora");
  revisarErrorConsulta(sesionError, "No pudimos validar tu sesión docente.");
  revisarErrorConsulta(grupoError, "No pudimos cargar este grupo.");
  revisarErrorConsulta(estudiantesError, "No pudimos cargar la lista de estudiantes.");
  revisarErrorConsulta(unidadesError, "No pudimos cargar las unidades del curso.");
  revisarErrorConsulta(actividadesError, "No pudimos cargar las actividades del curso.");
  revisarErrorConsulta(avisosError, "No pudimos cargar los avisos del grupo.");
  revisarErrorConsulta(eventosError, "No pudimos cargar los eventos del grupo.");

  if (!grupo) notFound();

  const estudiantes = (estudiantesTodos ?? []).filter((e) => e.activo);
  const estudiantesBaja = (estudiantesTodos ?? []).filter((e) => !e.activo);
  const primerIngresoPendiente = estudiantes.filter((e) => e.debe_cambiar_nip).length;
  // Las métricas del grupo representan al roster activo. Las entregas de una
  // persona dada de baja se conservan para su ficha, pero no deben inflar el
  // avance ni aparecer como casos sin nombre en este panel.
  const idsEstudiantesGrupo = estudiantes.map((estudiante) => estudiante.id);
  const [
    { data: entregas, error: entregasError },
    { data: confianzas, error: confianzasError },
    { data: bitacoras, error: bitacorasError },
    { data: reflexiones, error: reflexionesError },
  ] = await Promise.all([
    cargarEntregasPaginadas<EntregaResumenGrupo>(
      supabase,
      idsEstudiantesGrupo,
      "id, estudiante_id, actividad_id, estado, created_at, puntaje_auto, respuesta",
    ),
    idsEstudiantesGrupo.length
      ? supabase.from("autoevaluaciones_confianza").select("estudiante_id, unidad_id, momento, valor").in("estudiante_id", idsEstudiantesGrupo)
      : Promise.resolve({ data: [], error: null }),
    idsEstudiantesGrupo.length
      ? supabase.from("bitacora").select("estudiante_id, unidad_id, meta, cumplida").in("estudiante_id", idsEstudiantesGrupo)
      : Promise.resolve({ data: [], error: null }),
    cargarReflexionesPaginadas(supabase, idsEstudiantesGrupo),
  ]);
  revisarErrorConsulta(entregasError, "No pudimos cargar el avance del grupo.");
  revisarErrorConsulta(confianzasError, "No pudimos cargar los niveles de seguridad.");
  revisarErrorConsulta(bitacorasError, "No pudimos cargar las expectativas de apertura.");
  revisarErrorConsulta(reflexionesError, "No pudimos cargar las reflexiones del grupo.");

  // La tabla entregas puede contener respuestas JSON grandes. El panel solo
  // necesita las elecciones del estudiante para la matriz de confusión; las
  // respuestas correctas se leen del contenido de la actividad en el servidor
  // y nunca se guardan dentro de la respuesta visible al estudiante.
  const tiposConConfusion = new Set(["clasificacion", "etiquetado_texto"]);
  const actividadesMapa = new Map(
    (actividades ?? []).map((actividad) => {
      const tipo = Array.isArray(actividad.tipos_actividad)
        ? actividad.tipos_actividad[0]
        : actividad.tipos_actividad;
      const unidad = (unidades ?? []).find((item) => item.id === actividad.unidad_id);
      return [
        actividad.id,
        {
          titulo: actividad.titulo,
          orden: actividad.orden,
          tipo: tipo?.nombre ?? "otro",
          unidadId: actividad.unidad_id,
          unidadOrden: unidad?.orden ?? null,
          unidadNombre: unidad?.nombre ?? "Sin unidad",
          contenido: actividad.contenido as Record<string, unknown>,
        },
      ];
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
        idsEstudiantesGrupo,
        "id, estudiante_id, actividad_id, respuesta",
        idsActividadesConConfusion,
      )
    : { data: [] as EntregaConfusionGrupo[], error: null };
  revisarErrorConsulta(entregasConConfusionError, "No pudimos cargar los datos para detectar dificultades comunes.");

  const entregasSeguras = entregas ?? [];
  const entregasPorEstudiante = new Map<string, typeof entregasSeguras>();
  const entregasPorActividad = new Map<string, typeof entregasSeguras>();
  const ultimaEntregaPorEstudianteYActividad = new Map<string, typeof entregasSeguras[number]>();
  for (const entrega of entregasSeguras) {
    const delEstudiante = entregasPorEstudiante.get(entrega.estudiante_id) ?? [];
    delEstudiante.push(entrega);
    entregasPorEstudiante.set(entrega.estudiante_id, delEstudiante);
    const deLaActividad = entregasPorActividad.get(entrega.actividad_id) ?? [];
    deLaActividad.push(entrega);
    entregasPorActividad.set(entrega.actividad_id, deLaActividad);
    ultimaEntregaPorEstudianteYActividad.set(`${entrega.estudiante_id}:${entrega.actividad_id}`, entrega);
  }
  const avanceDeActividadesAbiertas = calcularAvanceDeActividadesAbiertas({
    actividades: (actividades ?? []).map((actividad) => ({ id: actividad.id, contenido: actividad.contenido })),
    aperturas: (eventos ?? []).map((evento) => ({
      tipo: evento.tipo,
      actividad_id: evento.actividad_id,
      fecha: evento.fecha,
    })),
    entregas: entregasSeguras,
    estudiantesIds: idsEstudiantesGrupo,
  });
  const { actividadesAbiertas, completadasPorEstudiante, avancePorEstudiante } = avanceDeActividadesAbiertas;

  // La actividad se mide respecto al momento en que se solicita el panel.
  // eslint-disable-next-line react-hooks/purity
  const hoy = Date.now();

  const porEstudiante = (estudiantes ?? []).map((e) => {
    const misEntregas = entregasPorEstudiante.get(e.id) ?? [];
    const avance = avancePorEstudiante.get(e.id) ?? 0;
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
  const avancePromedio =
    porEstudiante.length > 0
      ? Math.round(porEstudiante.reduce((s, e) => s + e.avance, 0) / porEstudiante.length)
      : 0;
  const activosSemana = porEstudiante.filter((e) => e.diasInactivo !== null && e.diasInactivo <= 7).length;
  // Más antigua primero: sin esto salían en el orden arbitrario en que las
  // devolvía Postgres, no en el orden en que conviene atenderlas.
  const avancePorUnidad = (unidades ?? []).map((u) => {
    const actsUnidad = (actividades ?? []).filter((a) => a.unidad_id === u.id);
    const actividadesAbiertasUnidad = actsUnidad.filter((actividad) => actividadesAbiertas.has(actividad.id));
    const totalPosible = actividadesAbiertasUnidad.length * estudiantes.length;
    const hechas = [...completadasPorEstudiante.values()].reduce(
      (total, completadas) => total + actividadesAbiertasUnidad.filter((actividad) => completadas.has(actividad.id)).length,
      0,
    );
    return {
      ...u,
      actividadesAbiertas: actividadesAbiertasUnidad.length,
      totalActividades: actsUnidad.length,
      porcentaje: totalPosible > 0 ? Math.round((hechas / totalPosible) * 100) : null,
    };
  });

  const confianzaInicialPorClave = new Map(
    (confianzas ?? [])
      .filter((confianza) => confianza.momento === "inicio")
      .map((confianza) => [`${confianza.estudiante_id}:${confianza.unidad_id}`, confianza.valor]),
  );
  const comparacionesConfianza = estudiantes.flatMap((estudiante) =>
    (unidades ?? []).flatMap((unidad) => {
      const confianza = confianzaInicialPorClave.get(`${estudiante.id}:${unidad.id}`) ?? null;
      const puntajes = (actividades ?? [])
        .filter((actividad) => actividad.unidad_id === unidad.id)
        .map((actividad) => ultimaEntregaPorEstudianteYActividad.get(`${estudiante.id}:${actividad.id}`)?.puntaje_auto ?? null)
        .filter((puntaje): puntaje is number => puntaje !== null);
      if (confianza === null || puntajes.length === 0) return [];
      const promedio = Math.round(puntajes.reduce((total, puntaje) => total + puntaje, 0) / puntajes.length);
      return [casoCalibracion(confianza, promedio)];
    }),
  );
  const comparacionesCercanas = comparacionesConfianza.filter(
    (caso) => caso === "bien_calibrado_alto" || caso === "bien_calibrado_bajo",
  ).length;

  // Los resultados automáticos se muestran por actividad y no por tipo para
  // que la docente reconozca enseguida el ejercicio al que corresponde cada
  // porcentaje. La comparación semanal solo aparece cuando ambos periodos
  // tienen entregas para esa actividad.
  const hace7dias = hoy - 7 * 24 * 60 * 60 * 1000;
  const hace14dias = hoy - 14 * 24 * 60 * 60 * 1000;
  const entregasSemanaActual = (entregas ?? []).filter(
    (en) => new Date(en.created_at).getTime() >= hace7dias,
  );
  const entregasSemanaAnterior = (entregas ?? []).filter((en) => {
    const t = new Date(en.created_at).getTime();
    return t >= hace14dias && t < hace7dias;
  });
  function promedioPuntajePorActividad(arr: typeof entregasSeguras, actividadId: string) {
    const conPuntaje = (arr ?? []).filter(
      (en) => en.puntaje_auto !== null && en.actividad_id === actividadId,
    );
    return conPuntaje.length > 0
      ? Math.round(conPuntaje.reduce((s, en) => s + (en.puntaje_auto ?? 0), 0) / conPuntaje.length)
      : null;
  }
  const precisionPorActividad = (actividades ?? [])
    .map((actividad) => {
      const puntajes = (entregasPorActividad.get(actividad.id) ?? [])
        .map((entrega) => entrega.puntaje_auto)
        .filter((puntaje): puntaje is number => puntaje !== null);
      if (puntajes.length === 0) return null;
      const actual = promedioPuntajePorActividad(entregasSemanaActual, actividad.id);
      const anterior = promedioPuntajePorActividad(entregasSemanaAnterior, actividad.id);
      const datosActividad = actividadesMapa.get(actividad.id);
      return {
        id: actividad.id,
        titulo: actividad.titulo,
        unidadOrden: datosActividad?.unidadOrden ?? null,
        unidadNombre: datosActividad?.unidadNombre ?? "Sin unidad",
        promedio: Math.round(puntajes.reduce((total, puntaje) => total + puntaje, 0) / puntajes.length),
        n: puntajes.length,
        tendencia: actual !== null && anterior !== null ? actual - anterior : null,
      };
    })
    .filter((actividad): actividad is NonNullable<typeof actividad> => actividad !== null)
    .sort((a, b) => a.promedio - b.promedio || (a.unidadOrden ?? 0) - (b.unidadOrden ?? 0) || a.titulo.localeCompare(b.titulo));

  // Matriz de confusión por elemento: no solo "clasificación va al 69%",
  // sino "el grupo confunde 'Receptor' con 'Emisor' en 5 entregas" — mismo
  // dato ya guardado en respuesta.elegidas, solo que agregado más fino.
  const confusionMap = new Map<string, { elemento: string; correcta: string; elegida: string; veces: number }>();
  for (const en of entregasConConfusion ?? []) {
    const respuesta = en.respuesta as { elegidas?: string[] } | null;
    const elegidas = respuesta?.elegidas ?? [];
    const actividad = actividadesMapa.get(en.actividad_id);
    const contenido = (actividad as { contenido?: Record<string, unknown> } | undefined)?.contenido ?? {};
    const elementos = actividad?.tipo === "clasificacion"
      ? ((contenido.elementos as { texto?: string; categoria_correcta?: string }[] | undefined) ?? []).map((item) => ({
          texto: item.texto ?? "",
          correcta: item.categoria_correcta ?? "",
        }))
      : ((contenido.fragmentos as { texto?: string; etiqueta_correcta?: string }[] | undefined) ?? []).map((item) => ({
          texto: item.texto ?? "",
          correcta: item.etiqueta_correcta ?? "",
        }));

    elementos.forEach((item, i) => {
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
      if (diasDesdeAlta >= 3) alertas.push({ tipo: "sin_comenzar", estudianteId: e.id, texto: `${e.nombre} todavía no ha empezado a practicar.` });
    } else if (e.diasInactivo !== null && e.diasInactivo > DIAS_INACTIVIDAD) {
      alertas.push({ tipo: "inactividad", estudianteId: e.id, texto: `${e.nombre} sin actividad hace ${e.diasInactivo} días.` });
    }
  }
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col gap-8 px-6 py-10 lg:px-8">
      <PageHeader
        volverHref="/docente/dashboard"
        titulo={grupo.nombre}
        descripcion={`${estudiantes?.length ?? 0} estudiantes activos`}
        accion={<EditarGrupo grupoId={grupo.id} nombreActual={grupo.nombre} codigoActual={grupo.codigo_acceso} />}
      />

      <AccesoGrupo codigo={grupo.codigo_acceso} nombreGrupo={grupo.nombre} />

      <nav aria-label="Secciones del grupo" className="sticky top-0 z-10 -mx-6 flex gap-1 overflow-x-auto whitespace-nowrap border-b border-slate-200 bg-slate-50/95 px-6 py-2 backdrop-blur lg:-mx-8 lg:px-8 dark:border-slate-800 dark:bg-slate-950/95">
        {[
          { href: "#resumen", etiqueta: "Resumen" },
          { href: "#estudiantes", etiqueta: "Estudiantes" },
          { href: "#seguimiento", etiqueta: "Seguimiento" },
          { href: "#analisis", etiqueta: "Análisis" },
          { href: "#operacion", etiqueta: "Fechas y avisos" },
          { href: "#atencion", etiqueta: "Alertas" },
          { href: "#eliminacion", etiqueta: "Eliminar grupo" },
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

      <section id="resumen" className="scroll-mt-16 flex flex-col gap-3" aria-labelledby="resumen-titulo">
        <h2 id="resumen-titulo" className="text-lg font-semibold text-slate-900 dark:text-slate-50">Resumen</h2>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricCard
            etiqueta="Participación"
            valor={`${activosSemana}/${estudiantes?.length ?? 0}`}
            descripcion="Con al menos una entrega en los últimos 7 días"
            icon={Activity}
            tono="emerald"
          />
          <MetricCard
            etiqueta="Avance"
            valor={`${avancePromedio}%`}
            descripcion="Actividades completas de las que ya se abrieron"
            icon={TrendingUp}
            tono="indigo"
          />
          <MetricCard
            etiqueta="Confianza frente al resultado"
            valor={comparacionesConfianza.length > 0 ? comparacionesCercanas : "Sin datos"}
            descripcion={comparacionesConfianza.length > 0
              ? `${comparacionesCercanas} de ${comparacionesConfianza.length} comparaciones quedaron a 25 puntos o menos.`
              : "Aún no hay unidades con confianza y resultado."}
            icon={Scale}
            tono="slate"
          />
          <MetricCard
            etiqueta="Sin primer ingreso"
            valor={primerIngresoPendiente}
            descripcion="No han cambiado su NIP inicial"
            icon={KeyRound}
            tono="amber"
          />
        </div>
      </section>

      <div id="estudiantes" className="scroll-mt-16 flex flex-col gap-8">
        <GrupoEstudiantesPanel
          grupoId={grupo.id}
          estudiantes={porEstudiante}
          estudiantesBaja={estudiantesBaja ?? []}
          nombresExistentes={[...(estudiantes ?? []), ...(estudiantesBaja ?? [])].map((e) => e.nombre)}
        />
      </div>

      <SeguimientoAprendizaje
        nombreGrupo={grupo.nombre}
        codigoGrupo={grupo.codigo_acceso}
        estudiantes={porEstudiante}
        unidades={(unidades ?? []).map((unidad) => ({ id: unidad.id, nombre: unidad.nombre, orden: unidad.orden }))}
        actividades={(actividades ?? []).map((actividad) => {
          const tipo = Array.isArray(actividad.tipos_actividad) ? actividad.tipos_actividad[0] : actividad.tipos_actividad;
          return { id: actividad.id, unidad_id: actividad.unidad_id, titulo: actividad.titulo, orden: actividad.orden, tipo: tipo?.nombre ?? "otro" };
        })}
        entregas={(entregas ?? []).map((entrega) => ({
          id: entrega.id,
          estudiante_id: entrega.estudiante_id,
          actividad_id: entrega.actividad_id,
          estado: entrega.estado,
          created_at: entrega.created_at,
          puntaje_auto: entrega.puntaje_auto,
        }))}
        confianzas={confianzas ?? []}
        reflexiones={reflexiones ?? []}
        bitacoras={bitacoras ?? []}
      />

      <section id="analisis" className="scroll-mt-20 flex flex-col gap-6" aria-labelledby="analisis-titulo">
        <h2 id="analisis-titulo" className="text-lg font-semibold text-slate-900 dark:text-slate-50">Análisis del grupo</h2>
        <section id="detalle" className="scroll-mt-16 flex flex-col gap-3" aria-labelledby="avance-unidad-titulo">
          <div>
            <h3 id="avance-unidad-titulo" className="text-base font-semibold text-slate-900 dark:text-slate-50">Avance por unidad</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Solo cuenta las actividades ya abiertas.</p>
          </div>
        <Card className="flex flex-col gap-4 p-5">
          {avancePorUnidad.map((u) => (
            <div key={u.id}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="text-slate-700 dark:text-slate-300">
                  Unidad {u.orden}. {u.nombre}
                </span>
                <span className="font-medium text-slate-900 dark:text-slate-50">
                  {u.porcentaje === null ? "Aún sin apertura" : `${u.porcentaje}%`}
                </span>
              </div>
              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                {u.actividadesAbiertas}/{u.totalActividades} actividades abiertas
              </p>
              {u.porcentaje !== null && <ProgressBar porcentaje={u.porcentaje} gradiente={temaUnidad(u.orden).barra} />}
            </div>
          ))}
        </Card>
      </section>

      {precisionPorActividad.length > 0 && (
          <section className="flex flex-col gap-3" aria-labelledby="aciertos-actividad-titulo">
            <h3 id="aciertos-actividad-titulo" className="text-base font-semibold text-slate-900 dark:text-slate-50">Aciertos por actividad</h3>
          <Card className="flex flex-col gap-4 p-5">
            {precisionPorActividad.map((actividad) => (
              <div key={actividad.id}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="min-w-0 pr-4 text-slate-700 dark:text-slate-300">
                    <span className="block truncate font-medium">{actividad.titulo}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {actividad.unidadOrden ? `Unidad ${actividad.unidadOrden}. ` : ""}{actividad.unidadNombre}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-50">
                    {actividad.tendencia !== null && actividad.tendencia !== 0 && (
                      <span
                        className={`flex items-center text-xs font-medium ${
                          actividad.tendencia > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {actividad.tendencia > 0 ? (
                          <TrendingUp className="size-3" aria-hidden="true" />
                        ) : (
                          <TrendingDown className="size-3" aria-hidden="true" />
                        )}
                        {actividad.tendencia > 0 ? "+" : ""}
                        {actividad.tendencia}
                      </span>
                    )}
                    {actividad.promedio}% · {actividad.n} {actividad.n === 1 ? "entrega" : "entregas"}
                  </span>
                </div>
                <ProgressBar
                  porcentaje={actividad.promedio}
                  gradiente={
                    actividad.promedio >= 70
                      ? "from-emerald-500 to-emerald-600"
                      : actividad.promedio >= 40
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
          <section className="flex flex-col gap-3" aria-labelledby="errores-frecuentes-titulo">
            <h3 id="errores-frecuentes-titulo" className="text-base font-semibold text-slate-900 dark:text-slate-50">Errores más frecuentes</h3>
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
                <td className="px-4 py-3 text-center font-semibold text-slate-400 dark:text-slate-400">{i + 1}</td>
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">{c.elemento}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                  {c.elegida} <span className="text-xs text-slate-400 dark:text-slate-400">(correcta: {c.correcta})</span>
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

      </section>

      <details id="operacion" className="scroll-mt-20 rounded-xl border border-slate-200 dark:border-slate-800">
        <summary className="cursor-pointer px-4 py-3.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
          Fechas y avisos
          <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">{eventos?.length ?? 0} fechas · {avisos?.length ?? 0} avisos</span>
        </summary>
        <div className="flex flex-col gap-6 border-t border-slate-200 p-4 dark:border-slate-800">
          <div id="avisos" className="scroll-mt-20 flex flex-col gap-8">
            <Eventos
              grupoId={grupo.id}
              unidades={unidades ?? []}
              eventos={eventos ?? []}
              actividades={(actividades ?? []).map((actividad) => ({
                id: actividad.id,
                unidad_id: actividad.unidad_id,
                titulo: actividad.titulo,
              }))}
            />
            <Avisos grupoId={grupo.id} avisos={avisos ?? []} />
          </div>
        </div>
      </details>

      <details id="atencion" className="scroll-mt-20 rounded-xl border border-slate-200 dark:border-slate-800">
        <summary className="cursor-pointer px-4 py-3.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
          Alertas de actividad
          <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">
            {alertas.length}
          </span>
        </summary>
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          {alertas.length > 0 ? (
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/25 dark:text-amber-100">
              <ul className="mt-2 flex flex-col gap-2">
                {alertas.map((alerta) => (
                  <li key={`${alerta.estudianteId}-${alerta.texto}`} className="flex flex-wrap items-center justify-between gap-2">
                    <span>{alerta.texto}</span>
                    <Link href={`/docente/estudiantes/${alerta.estudianteId}`} className="text-xs font-semibold underline underline-offset-2">
                      Ver perfil
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-400">No hay alertas de actividad.</p>
          )}
        </div>
      </details>

      <section id="eliminacion" className="scroll-mt-20 rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900/60 dark:bg-red-950/15" aria-labelledby="eliminacion-titulo">
        <h2 id="eliminacion-titulo" className="text-base font-semibold text-red-800 dark:text-red-200">Zona de riesgo</h2>
        <p className="mt-1 text-sm text-red-700 dark:text-red-300">Eliminar este grupo borra su información de forma permanente.</p>
        <div className="mt-3">
          <EliminarGrupo
            grupoId={grupo.id}
            nombreGrupo={grupo.nombre}
            totalEstudiantes={(estudiantes?.length ?? 0) + (estudiantesBaja?.length ?? 0)}
          />
        </div>
      </section>
    </div>
  );
}
