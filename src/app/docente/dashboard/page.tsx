import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, BarChart3, BookOpen, ChevronRight, CircleAlert, Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import CerrarSesion from "@/components/cerrar-sesion";
import Avatar from "@/components/ui/avatar";
import { CardLink } from "@/components/ui/card";
import EmptyState from "@/components/ui/empty-state";
import MetricCard from "@/components/ui/metric-card";
import { revisarErrorConsulta } from "@/lib/revisar-error-consulta";
import { obtenerUsuarioActual } from "@/lib/supabase/usuario-actual";
import { calcularAvanceDeActividadesAbiertas } from "@/lib/avance-actividades-abiertas";

type EstudianteDashboard = {
  id: string;
  grupo_id: string;
  created_at: string;
  activo: boolean;
  debe_cambiar_nip: boolean;
};

type EntregaDashboard = {
  estudiante_id: string;
  actividad_id: string;
  created_at: string;
  puntaje_auto: number | null;
  respuesta: unknown;
};

const TAMANO_PAGINA_ENTREGAS = 1000;

export default async function DashboardDocente() {
  const supabase = await createClient();
  const {
    data: { user },
    error: sesionError,
  } = await obtenerUsuarioActual();

  revisarErrorConsulta(sesionError, "No pudimos validar tu sesión docente.");
  if (!user) redirect("/ingreso/profesora");

  const [
    { data: docente, error: docenteError },
    { data: grupos, error: gruposError },
    { data: unidades, error: unidadesError },
    { data: estudiantes, error: estudiantesError },
    { data: actividades, error: actividadesError },
  ] = await Promise.all([
    // El layout ya valida el perfil; `maybeSingle` evita un 406 fugaz en
    // sesiones antiguas o durante la creación del perfil y permite que el
    // redirect del layout sea la única salida para una docente sin perfil.
    supabase.from("docentes").select("nombre").eq("id", user.id).maybeSingle(),
    supabase
      .from("grupos")
      .select("id, nombre, codigo_acceso, ciclo_escolar, modo")
      .eq("docente_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("unidades").select("id, nombre, orden, reto_comunicativo, actividades(id)").order("orden"),
    supabase.from("estudiantes").select("id, grupo_id, created_at, activo, debe_cambiar_nip").eq("activo", true),
    supabase.from("actividades").select("id, contenido"),
  ]);

  const entregasResumen: EntregaDashboard[] = [];
  let entregasError: { message?: string; code?: string } | null = null;
  const estudianteIds = (estudiantes ?? []).map((estudiante) => estudiante.id);
  if (estudianteIds.length > 0) {
    const { count, error: conteoError } = await supabase
      .from("entregas")
      .select("id", { count: "exact", head: true })
      .in("estudiante_id", estudianteIds);
    if (conteoError) {
      entregasError = conteoError;
    } else {
      const paginas = Array.from({ length: Math.ceil((count ?? 0) / TAMANO_PAGINA_ENTREGAS) }, (_, indice) => indice * TAMANO_PAGINA_ENTREGAS);
      const resultados = await Promise.all(
        paginas.map((desde) =>
          supabase
            .from("entregas")
            .select("estudiante_id, actividad_id, created_at, puntaje_auto, respuesta")
            .in("estudiante_id", estudianteIds)
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .range(desde, desde + TAMANO_PAGINA_ENTREGAS - 1),
        ),
      );
      const resultadoConError = resultados.find((resultado) => resultado.error);
      if (resultadoConError?.error) {
        entregasError = resultadoConError.error;
      } else {
        resultados.forEach((resultado) => entregasResumen.push(...((resultado.data ?? []) as EntregaDashboard[])));
      }
    }
  }

  const gruposCurso = (grupos ?? []).filter((grupo) => grupo.modo === "curso");
  const grupoIds = gruposCurso.map((grupo) => grupo.id);
  const { data: aperturas, error: aperturasError } = grupoIds.length > 0
    ? await supabase
        .from("eventos")
        .select("grupo_id, tipo, actividad_id, fecha")
        .in("grupo_id", grupoIds)
        .eq("tipo", "apertura_actividad")
    : { data: [], error: null };

  revisarErrorConsulta(docenteError, "No pudimos cargar tu perfil docente.");
  revisarErrorConsulta(gruposError, "No pudimos cargar tus grupos.");
  revisarErrorConsulta(unidadesError, "No pudimos cargar las unidades del curso.");
  revisarErrorConsulta(estudiantesError, "No pudimos cargar el resumen de estudiantes.");
  revisarErrorConsulta(actividadesError, "No pudimos cargar las actividades del curso.");
  revisarErrorConsulta(entregasError, "No pudimos cargar el resumen de avance.");
  revisarErrorConsulta(aperturasError, "No pudimos cargar las fechas de apertura.");

  if (!docente) redirect("/ingreso/profesora/verificar");

  // El resumen reutiliza las entregas que ya se necesitan para los grupos,
  // evitando una consulta independiente por cada tarjeta.
  const idsGruposCurso = new Set(grupoIds);
  const estudiantesActivos = ((estudiantes ?? []) as EstudianteDashboard[]).filter((estudiante) => idsGruposCurso.has(estudiante.grupo_id));
  const entregasPorEstudiante = new Map<string, { total: number; ultima: number | null }>();
  for (const entrega of entregasResumen) {
    const actual = entregasPorEstudiante.get(entrega.estudiante_id) ?? { total: 0, ultima: null };
    const fecha = new Date(entrega.created_at).getTime();
    actual.total += 1;
    actual.ultima = actual.ultima === null ? fecha : Math.max(actual.ultima, fecha);
    entregasPorEstudiante.set(entrega.estudiante_id, actual);
  }

  const estudiantesPorGrupo = new Map<string, string[]>();
  for (const estudiante of estudiantesActivos) {
    const ids = estudiantesPorGrupo.get(estudiante.grupo_id) ?? [];
    ids.push(estudiante.id);
    estudiantesPorGrupo.set(estudiante.grupo_id, ids);
  }
  const aperturasPorGrupo = new Map<string, typeof aperturas>();
  for (const apertura of aperturas ?? []) {
    const delGrupo = aperturasPorGrupo.get(apertura.grupo_id) ?? [];
    delGrupo.push(apertura);
    aperturasPorGrupo.set(apertura.grupo_id, delGrupo);
  }
  const avancePorEstudiante = new Map<string, number>();
  for (const grupo of gruposCurso) {
    const resumen = calcularAvanceDeActividadesAbiertas({
      actividades: (actividades ?? []).map((actividad) => ({ id: actividad.id, contenido: actividad.contenido })),
      aperturas: (aperturasPorGrupo.get(grupo.id) ?? []).map((apertura) => ({
        tipo: apertura.tipo,
        actividad_id: apertura.actividad_id,
        fecha: apertura.fecha,
      })),
      entregas: entregasResumen,
      estudiantesIds: estudiantesPorGrupo.get(grupo.id) ?? [],
    });
    for (const [estudianteId, avance] of resumen.avancePorEstudiante) avancePorEstudiante.set(estudianteId, avance);
  }

  // eslint-disable-next-line react-hooks/purity
  const hoy = Date.now();
  const metricasPorGrupo = new Map<string, { estudiantes: number; sinEmpezar: number; activosSemana: number; avanceTotal: number; primerIngresoPendiente: number }>();
  for (const estudiante of estudiantesActivos) {
    const actual = metricasPorGrupo.get(estudiante.grupo_id) ?? {
      estudiantes: 0,
      sinEmpezar: 0,
      activosSemana: 0,
      avanceTotal: 0,
      primerIngresoPendiente: 0,
    };
    const entregasEstudiante = entregasPorEstudiante.get(estudiante.id);
    const avance = avancePorEstudiante.get(estudiante.id) ?? 0;
    const diasDesdeUltima = entregasEstudiante?.ultima === null || entregasEstudiante?.ultima === undefined
      ? null
      : Math.floor((hoy - entregasEstudiante.ultima) / (1000 * 60 * 60 * 24));
    actual.estudiantes += 1;
    actual.sinEmpezar += entregasEstudiante?.total ? 0 : 1;
    actual.activosSemana += diasDesdeUltima !== null && diasDesdeUltima <= 7 ? 1 : 0;
    actual.avanceTotal += avance;
    actual.primerIngresoPendiente += estudiante.debe_cambiar_nip ? 1 : 0;
    metricasPorGrupo.set(estudiante.grupo_id, actual);
  }

  const totalEstudiantes = estudiantesActivos.length;
  const estudiantesSinEmpezar = estudiantesActivos.filter((estudiante) => !(entregasPorEstudiante.get(estudiante.id)?.total ?? 0)).length;
  const estudiantesActivosSemana = estudiantesActivos.filter((estudiante) => {
    const ultima = entregasPorEstudiante.get(estudiante.id)?.ultima;
    return ultima !== undefined && ultima !== null && Math.floor((hoy - ultima) / (1000 * 60 * 60 * 24)) <= 7;
  }).length;
  const avanceGeneral = totalEstudiantes > 0
    ? Math.round(estudiantesActivos.reduce((total, estudiante) => total + (avancePorEstudiante.get(estudiante.id) ?? 0), 0) / totalEstudiantes)
    : 0;

  return (
    <div className="teacher-shell mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-8 px-6 py-8 sm:py-10">
      <header className="relative overflow-hidden rounded-[1.9rem] border border-indigo-200/70 bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 p-5 text-white shadow-xl shadow-indigo-700/20 sm:p-6">
        <div aria-hidden="true" className="absolute -right-14 -top-14 size-52 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden="true" className="absolute -bottom-20 left-1/3 size-52 rounded-full bg-cyan-300/15 blur-3xl" />
        <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar nombre={docente.nombre} size="lg" />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-100">Espacio docente</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Hola, {docente.nombre.split(" ")[0]}
            </h1>
            <p className="mt-1 text-sm text-indigo-100">Empieza por una decisión, no por una tabla.</p>
          </div>
        </div>
        <CerrarSesion className="shrink-0 border border-white/15 bg-white/10 text-white hover:bg-white/20 hover:text-white dark:text-white dark:hover:bg-white/20 dark:hover:text-white" />
        </div>
        <div className="relative mt-5 grid gap-2.5 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm"><p className="text-[11px] font-bold uppercase tracking-wide text-indigo-100">Para atender</p><p className="mt-1 text-xl font-bold">{estudiantesSinEmpezar}</p><p className="text-xs text-indigo-100">sin comenzar</p></div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm"><p className="text-[11px] font-bold uppercase tracking-wide text-indigo-100">Ritmo reciente</p><p className="mt-1 text-xl font-bold">{estudiantesActivosSemana}</p><p className="text-xs text-indigo-100">activos esta semana</p></div>
          <Link href="/docente/analitica" className="group rounded-2xl border border-white/20 bg-white/15 px-4 py-3 backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-indigo-100"><BarChart3 className="size-3.5" aria-hidden="true" />Analítica</span><p className="mt-1 text-base font-bold">Ver tendencias</p><p className="mt-0.5 text-xs text-indigo-100">Compara grupos y unidades</p></Link>
        </div>
      </header>

      <section className="rounded-[1.6rem] border border-white/80 bg-white/80 p-4 shadow-[0_16px_34px_-28px_rgb(15_23_42/0.42)] backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-900/80 sm:p-5" aria-labelledby="resumen-curso">
        <div>
          <h2 id="resumen-curso" className="text-lg font-semibold text-slate-900 dark:text-slate-50">Resumen del curso</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Solo las cohortes académicas entran en este resumen.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard etiqueta="Estudiantes activos" valor={totalEstudiantes} icon={Users} tono="slate" />
          <MetricCard etiqueta="Activos esta semana" valor={estudiantesActivosSemana} icon={Activity} tono="emerald" />
          <MetricCard etiqueta="Sin comenzar" valor={estudiantesSinEmpezar} icon={CircleAlert} tono="amber" />
          <MetricCard
            etiqueta="Avance promedio"
            valor={`${avanceGeneral}%`}
            descripcion="Actividades completas de las que ya se abrieron"
            icon={BookOpen}
            tono="indigo"
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Tus grupos</h2>
          <Link
            href="/docente/grupos/nuevo"
            className="inline-flex h-11 touch-manipulation items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-sm font-medium text-white transition-[color,background-color,border-color,transform] duration-150 hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 active:scale-[0.97] dark:focus-visible:ring-offset-slate-950"
          >
            <Plus className="size-4" aria-hidden="true" />
            Crear grupo
          </Link>
        </div>
        {!grupos || grupos.length === 0 ? (
          <EmptyState
            icon={Users}
            titulo="Todavía no tienes grupos"
            descripcion="Crea el primero para generar su código de acceso."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {grupos.map((g) => (
              <Link key={g.id} href={`/docente/grupos/${g.id}`}>
                <CardLink className="flex h-full flex-col gap-4 px-5 py-4">
                  {(() => {
                    const metrica = metricasPorGrupo.get(g.id) ?? { estudiantes: 0, sinEmpezar: 0, activosSemana: 0, avanceTotal: 0, primerIngresoPendiente: 0 };
                    const avance = metrica.estudiantes > 0 ? Math.round(metrica.avanceTotal / metrica.estudiantes) : 0;
                    if (g.modo === "revision") {
                      return (
                        <>
                          <div className="flex items-start gap-4">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                              <BookOpen className="size-4" aria-hidden="true" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900 dark:text-slate-50">{g.nombre}</p>
                              <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">Entorno de revisión. Sus recorridos no alteran el avance, alertas ni comparativas del curso.</p>
                            </div>
                            <ChevronRight className="size-4 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                          </div>
                          <div className="rounded-2xl border border-violet-100 bg-violet-50/70 px-3.5 py-3 text-xs leading-relaxed text-violet-900 dark:border-violet-900/70 dark:bg-violet-950/30 dark:text-violet-100">
                            Todas las actividades permanecen disponibles, sin calendario ni aperturas programadas.
                          </div>
                          <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">Abrir espacio de revisión</p>
                        </>
                      );
                    }
                    return (
                      <>
                        <div className="flex items-start gap-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    <Users className="size-4" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-slate-50">{g.nombre}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Identificador del grupo{g.ciclo_escolar ? ` · ${g.ciclo_escolar}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{metrica.estudiantes} estudiantes activos</p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Código de acceso: <span className="font-mono font-semibold tracking-wide text-slate-700 dark:text-slate-300">{g.codigo_acceso}</span>
                        </p>
                        <div className="grid grid-cols-4 gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Avance abierto</p>
                            <p className="mt-0.5 font-semibold text-slate-900 dark:text-slate-50">{avance}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Activos 7 días</p>
                            <p className="mt-0.5 font-semibold text-slate-900 dark:text-slate-50">{metrica.activosSemana}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Sin comenzar</p>
                            <p className="mt-0.5 font-semibold text-slate-900 dark:text-slate-50">{metrica.sinEmpezar}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Primer ingreso pendiente</p>
                            <p className="mt-0.5 font-semibold text-slate-900 dark:text-slate-50">{metrica.primerIngresoPendiente}</p>
                          </div>
                        </div>
                        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Abrir seguimiento del grupo</p>
                      </>
                    );
                  })()}
                </CardLink>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Unidades del curso</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Consulta las actividades actuales y ajusta su contenido cuando sea necesario.</p>
        <div className="grid gap-3 md:grid-cols-3">
          {unidades?.map((u) => (
            <Link key={u.id} href={`/docente/unidades/${u.id}`}>
              <CardLink className="flex h-full items-center gap-4 px-4 py-3.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <BookOpen className="size-4" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-slate-50">
                    Unidad {u.orden}. {u.nombre}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{Array.isArray(u.actividades) ? u.actividades.length : 0} actividades</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden="true" />
              </CardLink>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
