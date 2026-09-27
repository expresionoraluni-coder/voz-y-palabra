import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, ArrowLeft, BarChart3, BookOpen, TrendingDown, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { obtenerUsuarioActual } from "@/lib/supabase/usuario-actual";
import { revisarErrorConsulta } from "@/lib/revisar-error-consulta";
import { actividadAbierta } from "@/lib/eventos";

type EntregaAnalitica = {
  estudiante_id: string;
  actividad_id: string;
  created_at: string;
  puntaje_auto: number | null;
};

const TAMANO_PAGINA = 1000;

async function cargarEntregas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  estudianteIds: string[],
): Promise<{ data: EntregaAnalitica[]; error: { message?: string; code?: string } | null }> {
  if (!estudianteIds.length) return { data: [], error: null };
  const { count, error: conteoError } = await supabase
    .from("entregas")
    .select("id", { count: "exact", head: true })
    .in("estudiante_id", estudianteIds);
  if (conteoError) return { data: [], error: conteoError };

  const paginas = Array.from({ length: Math.ceil((count ?? 0) / TAMANO_PAGINA) }, (_, indice) => indice * TAMANO_PAGINA);
  const resultados = await Promise.all(
    paginas.map((desde) =>
      supabase
        .from("entregas")
        .select("estudiante_id, actividad_id, created_at, puntaje_auto")
        .in("estudiante_id", estudianteIds)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(desde, desde + TAMANO_PAGINA - 1),
    ),
  );
  const resultadoConError = resultados.find((resultado) => resultado.error);
  return {
    data: resultados.flatMap((resultado) => (resultado.data ?? []) as EntregaAnalitica[]),
    error: resultadoConError?.error ?? null,
  };
}

function porcentaje(valor: number, total: number) {
  return total > 0 ? Math.round((valor / total) * 100) : 0;
}

export default async function AnaliticaDocente() {
  const supabase = await createClient();
  const { data: { user }, error: sesionError } = await obtenerUsuarioActual();
  revisarErrorConsulta(sesionError, "No pudimos validar tu sesión docente.");
  if (!user) redirect("/ingreso/profesora");

  const [
    { data: grupos, error: gruposError },
    { data: unidades, error: unidadesError },
    { data: actividades, error: actividadesError },
  ] = await Promise.all([
    supabase.from("grupos").select("id, nombre, ciclo_escolar").eq("docente_id", user.id).eq("modo", "curso").eq("activo", true).order("created_at"),
    supabase.from("unidades").select("id, nombre, orden").order("orden"),
    supabase.from("actividades").select("id, unidad_id, titulo, orden").order("orden"),
  ]);
  revisarErrorConsulta(gruposError, "No pudimos cargar tus grupos académicos.");
  revisarErrorConsulta(unidadesError, "No pudimos cargar las unidades del curso.");
  revisarErrorConsulta(actividadesError, "No pudimos cargar las actividades del curso.");

  const idsGrupo = (grupos ?? []).map((grupo) => grupo.id);
  const { data: estudiantes, error: estudiantesError } = idsGrupo.length
    ? await supabase.from("estudiantes").select("id, grupo_id").in("grupo_id", idsGrupo).eq("activo", true)
    : { data: [], error: null };
  revisarErrorConsulta(estudiantesError, "No pudimos cargar la actividad de tus grupos.");

  const idsEstudiante = (estudiantes ?? []).map((estudiante) => estudiante.id);
  const [{ data: aperturas, error: aperturasError }, entregasResultado] = await Promise.all([
    idsGrupo.length
      ? supabase.from("eventos").select("grupo_id, actividad_id, fecha").in("grupo_id", idsGrupo).eq("tipo", "apertura_actividad")
      : Promise.resolve({ data: [], error: null }),
    cargarEntregas(supabase, idsEstudiante),
  ]);
  revisarErrorConsulta(aperturasError, "No pudimos cargar las aperturas de actividades.");
  revisarErrorConsulta(entregasResultado.error, "No pudimos cargar las entregas para el análisis.");

  const estudiantesPorGrupo = new Map<string, string[]>();
  for (const estudiante of estudiantes ?? []) {
    const lista = estudiantesPorGrupo.get(estudiante.grupo_id) ?? [];
    lista.push(estudiante.id);
    estudiantesPorGrupo.set(estudiante.grupo_id, lista);
  }
  const actividadesAbiertasPorGrupo = new Map<string, Set<string>>();
  for (const apertura of aperturas ?? []) {
    if (!apertura.actividad_id || !actividadAbierta(apertura.fecha)) continue;
    const lista = actividadesAbiertasPorGrupo.get(apertura.grupo_id) ?? new Set<string>();
    lista.add(apertura.actividad_id);
    actividadesAbiertasPorGrupo.set(apertura.grupo_id, lista);
  }
  const grupoPorEstudiante = new Map((estudiantes ?? []).map((estudiante) => [estudiante.id, estudiante.grupo_id]));
  const entregasPorGrupo = new Map<string, EntregaAnalitica[]>();
  for (const entrega of entregasResultado.data) {
    const grupoId = grupoPorEstudiante.get(entrega.estudiante_id);
    if (!grupoId) continue;
    const lista = entregasPorGrupo.get(grupoId) ?? [];
    lista.push(entrega);
    entregasPorGrupo.set(grupoId, lista);
  }

  // La foto analítica se calcula en el servidor al solicitar esta página.
  // eslint-disable-next-line react-hooks/purity
  const hace7Dias = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const comparativaGrupos = (grupos ?? []).map((grupo) => {
    const estudiantesGrupo = estudiantesPorGrupo.get(grupo.id) ?? [];
    const abiertas = actividadesAbiertasPorGrupo.get(grupo.id) ?? new Set<string>();
    const entregas = entregasPorGrupo.get(grupo.id) ?? [];
    const completadas = new Set(entregas.map((entrega) => `${entrega.estudiante_id}:${entrega.actividad_id}`));
    const posibles = estudiantesGrupo.length * abiertas.size;
    const puntajes = entregas.map((entrega) => entrega.puntaje_auto).filter((puntaje): puntaje is number => puntaje !== null);
    const activos = new Set(entregas.filter((entrega) => new Date(entrega.created_at).getTime() >= hace7Dias).map((entrega) => entrega.estudiante_id));
    return {
      ...grupo,
      estudiantes: estudiantesGrupo.length,
      avance: posibles ? porcentaje([...completadas].filter((clave) => abiertas.has(clave.split(":")[1])).length, posibles) : 0,
      activos: activos.size,
      resultado: puntajes.length ? Math.round(puntajes.reduce((total, puntaje) => total + puntaje, 0) / puntajes.length) : null,
      actividadesAbiertas: abiertas.size,
    };
  });

  const resumenUnidades = (unidades ?? []).map((unidad) => {
    const idsActividad = new Set((actividades ?? []).filter((actividad) => actividad.unidad_id === unidad.id).map((actividad) => actividad.id));
    const entregasUnidad = entregasResultado.data.filter((entrega) => idsActividad.has(entrega.actividad_id));
    const puntajes = entregasUnidad.map((entrega) => entrega.puntaje_auto).filter((puntaje): puntaje is number => puntaje !== null);
    const estudiantesConEntrega = new Set(entregasUnidad.map((entrega) => entrega.estudiante_id));
    return {
      ...unidad,
      estudiantesConEntrega: estudiantesConEntrega.size,
      resultado: puntajes.length ? Math.round(puntajes.reduce((total, puntaje) => total + puntaje, 0) / puntajes.length) : null,
      entregas: entregasUnidad.length,
    };
  });

  const totalEstudiantes = (estudiantes ?? []).length;
  const activosSemana = new Set(entregasResultado.data.filter((entrega) => new Date(entrega.created_at).getTime() >= hace7Dias).map((entrega) => entrega.estudiante_id)).size;
  const promedioGeneral = comparativaGrupos.length
    ? Math.round(comparativaGrupos.reduce((total, grupo) => total + grupo.avance, 0) / comparativaGrupos.length)
    : 0;

  return (
    <main className="teacher-shell mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-7 px-6 py-8 sm:py-10">
      <header className="relative overflow-hidden rounded-[1.9rem] border border-indigo-200/70 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 p-5 text-white shadow-xl shadow-indigo-950/20 sm:p-6">
        <div aria-hidden="true" className="absolute -right-14 -top-16 size-56 rounded-full bg-cyan-300/15 blur-3xl" />
        <Link href="/docente/dashboard" className="relative inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-indigo-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><ArrowLeft className="size-4" aria-hidden="true" />Panel docente</Link>
        <div className="relative mt-4 flex flex-wrap items-end justify-between gap-4">
          <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-cyan-200"><BarChart3 className="size-4" aria-hidden="true" />Analítica de aprendizaje</p><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Datos para acompañar mejor</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-indigo-100">Las comparativas incluyen únicamente grupos académicos; el grupo de revisión queda fuera.</p></div>
          <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-2xl bg-white/10 px-3 py-2.5"><p className="text-lg font-bold">{totalEstudiantes}</p><p className="text-[11px] text-indigo-100">estudiantes</p></div><div className="rounded-2xl bg-white/10 px-3 py-2.5"><p className="text-lg font-bold">{activosSemana}</p><p className="text-[11px] text-indigo-100">activos / 7 días</p></div><div className="rounded-2xl bg-white/10 px-3 py-2.5"><p className="text-lg font-bold">{promedioGeneral}%</p><p className="text-[11px] text-indigo-100">avance medio</p></div></div>
        </div>
      </header>

      {comparativaGrupos.length === 0 ? (
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">Aún no hay grupos académicos activos para comparar. El espacio de revisión se conserva separado de esta vista.</section>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[1.6rem] border border-white/80 bg-white/85 p-5 shadow-[0_16px_34px_-28px_rgb(15_23_42/0.42)] backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-900/85"><div className="flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"><Users className="size-5" aria-hidden="true" /></div><div><h2 className="font-bold text-slate-900 dark:text-slate-50">Avance por grupo</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Cuenta las actividades que ya se abrieron en cada grupo.</p></div></div><div className="mt-5 flex flex-col gap-4">{comparativaGrupos.map((grupo) => <Link key={grupo.id} href={`/docente/grupos/${grupo.id}`} className="group rounded-2xl px-2 py-1 transition hover:bg-indigo-50/80 dark:hover:bg-indigo-950/25"><div className="flex items-end justify-between gap-3"><div><p className="font-semibold text-slate-900 dark:text-slate-50">{grupo.nombre}</p><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{grupo.estudiantes} estudiantes · {grupo.actividadesAbiertas} actividades abiertas</p></div><p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{grupo.avance}%</p></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-500" style={{ width: `${grupo.avance}%` }} /></div></Link>)}</div></div>
            <aside className="rounded-[1.6rem] border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white p-5 shadow-[0_16px_34px_-28px_rgb(120_53_15/0.35)] dark:border-amber-900/60 dark:from-amber-950/20 dark:to-slate-900"><div className="flex size-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"><Activity className="size-5" aria-hidden="true" /></div><h2 className="mt-4 font-bold text-slate-900 dark:text-slate-50">Lectura rápida</h2><p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">No conviertas los números en etiquetas. Úsalos para decidir qué grupo abrir y a quién acompañar.</p><div className="mt-5 flex flex-col gap-3">{[...comparativaGrupos].sort((a, b) => a.activos - b.activos).slice(0, 2).map((grupo) => <Link key={grupo.id} href={`/docente/grupos/${grupo.id}#atencion`} className="rounded-2xl border border-amber-100 bg-white/75 p-3 text-sm transition hover:border-amber-300 dark:border-amber-900/60 dark:bg-slate-900/60"><p className="font-semibold text-slate-900 dark:text-slate-50">{grupo.nombre}</p><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{grupo.activos} con actividad en los últimos 7 días. Ver acompañamiento.</p></Link>)}</div></aside>
          </section>

          <section className="rounded-[1.6rem] border border-white/80 bg-white/85 p-5 shadow-[0_16px_34px_-28px_rgb(15_23_42/0.42)] backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-900/85"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-violet-700 dark:text-violet-300"><BookOpen className="size-3.5" aria-hidden="true" />Señales por unidad</p><h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-50">Dónde conviene mirar con más detalle</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">El promedio aparece sólo cuando la actividad tiene calificación automática.</p></div><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{resumenUnidades.map((unidad) => <div key={unidad.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Unidad {unidad.orden}</p><h3 className="mt-1 font-semibold text-slate-900 dark:text-slate-50">{unidad.nombre}</h3></div>{unidad.resultado !== null && <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${unidad.resultado >= 70 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200" : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"}`}>{unidad.resultado < 70 && <TrendingDown className="size-3" aria-hidden="true" />}{unidad.resultado}%</span>}</div><p className="mt-4 text-sm text-slate-600 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-slate-50">{unidad.estudiantesConEntrega}</span> estudiantes con entregas · {unidad.entregas} registros</p></div>)}</div></section>
        </>
      )}
    </main>
  );
}
