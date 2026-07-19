import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ChevronRight, ClipboardCheck, ThumbsUp, TrendingDown, TrendingUp, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AgregarEstudiantes from "./agregar-estudiantes";
import Avisos from "./avisos";
import Eventos from "./eventos";
import EditarGrupo from "./editar-grupo";
import EliminarGrupo from "./eliminar-grupo";
import ExportarGrupo from "./exportar-grupo";
import PageHeader from "@/components/ui/page-header";
import { Card, CardLink } from "@/components/ui/card";
import MetricCard from "@/components/ui/metric-card";
import ProgressBar from "@/components/ui/progress-bar";
import Alert from "@/components/ui/alert";
import Avatar from "@/components/ui/avatar";
import EmptyState from "@/components/ui/empty-state";
import { temaUnidad } from "@/lib/unidad-tema";

const DIAS_INACTIVIDAD = 10;

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
  // viajes de ida y vuelta seguidos a Supabase; ahora es 1 solo — y cada
  // viaje le cuesta a esta base ~500ms de latencia de red, así que esto es
  // la diferencia entre sentir la página "trabada" o instantánea.
  const [
    {
      data: { user },
    },
    { data: grupo },
    { data: estudiantes },
    { data: estudiantesBaja },
    { data: unidades },
    { data: actividades },
    { data: confianzas },
    { data: avisos },
    { data: eventos },
    { data: entregas },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("grupos")
      .select("id, nombre, codigo_acceso, ciclo_escolar")
      .eq("id", id)
      .single(),
    supabase
      .from("estudiantes")
      .select("id, nombre, created_at")
      .eq("grupo_id", id)
      .eq("activo", true)
      .order("nombre"),
    supabase
      .from("estudiantes")
      .select("id, nombre")
      .eq("grupo_id", id)
      .eq("activo", false)
      .order("nombre"),
    supabase.from("unidades").select("id, nombre, orden").order("orden"),
    supabase.from("actividades").select("id, unidad_id"),
    supabase.from("autoevaluaciones_confianza").select("estudiante_id, unidad_id, momento, valor"),
    supabase
      .from("avisos")
      .select("id, titulo, mensaje, created_at")
      .eq("grupo_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("eventos").select("id, titulo, tipo, fecha, unidad_id").eq("grupo_id", id),
    supabase
      .from("entregas")
      .select(
        "id, estudiante_id, actividad_id, estado, created_at, puntaje_auto, evaluacion_docente, respuesta, actividades(titulo, unidad_id, contenido, tipos_actividad(nombre)), estudiantes!inner(grupo_id)",
      )
      .eq("estudiantes.grupo_id", id),
  ]);

  if (!user) redirect("/ingreso/profesora");
  if (!grupo) notFound();

  const totalActividades = actividades?.length ?? 0;
  const hoy = Date.now();

  const porEstudiante = (estudiantes ?? []).map((e) => {
    const misEntregas = (entregas ?? []).filter((en) => en.estudiante_id === e.id);
    const avance = totalActividades > 0 ? Math.round((misEntregas.length / totalActividades) * 100) : 0;
    const fechas = misEntregas.map((en) => new Date(en.created_at).getTime());
    const ultima = fechas.length ? Math.max(...fechas) : null;
    const diasInactivo = ultima ? Math.floor((hoy - ultima) / (1000 * 60 * 60 * 24)) : null;
    return { ...e, avance, ultima, diasInactivo, totalEntregas: misEntregas.length };
  });

  const avancePromedio =
    porEstudiante.length > 0
      ? Math.round(porEstudiante.reduce((s, e) => s + e.avance, 0) / porEstudiante.length)
      : 0;
  const activosSemana = porEstudiante.filter((e) => e.diasInactivo !== null && e.diasInactivo <= 7).length;
  // Más antigua primero: sin esto salían en el orden arbitrario en que las
  // devolvía Postgres, no en el orden en que conviene atenderlas.
  const entregasPorRevisar = (entregas ?? [])
    .filter((en) => en.estado === "pendiente_revision")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const avancePorUnidad = (unidades ?? []).map((u) => {
    const actsUnidad = (actividades ?? []).filter((a) => a.unidad_id === u.id);
    const totalPosible = actsUnidad.length * (estudiantes?.length ?? 0);
    const hechas = (entregas ?? []).filter((en) =>
      actsUnidad.some((a) => a.id === en.actividad_id),
    ).length;
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
  function nombreTipoDe(en: { actividades: unknown }) {
    const act = Array.isArray(en.actividades) ? en.actividades[0] : en.actividades;
    const tipo = (act as { tipos_actividad?: unknown } | undefined)?.tipos_actividad;
    const t = Array.isArray(tipo) ? tipo[0] : tipo;
    return (t as { nombre?: string } | undefined)?.nombre ?? "otro";
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
  for (const en of entregas ?? []) {
    const act = Array.isArray(en.actividades) ? en.actividades[0] : en.actividades;
    const tipo = act
      ? Array.isArray(act.tipos_actividad)
        ? act.tipos_actividad[0]
        : act.tipos_actividad
      : undefined;
    if (!act || (tipo?.nombre !== "clasificacion" && tipo?.nombre !== "etiquetado_texto")) continue;

    const respuesta = en.respuesta as {
      elegidas?: string[];
      itemsSnapshot?: { texto: string; correcta: string }[];
    } | null;
    const elegidas = respuesta?.elegidas ?? [];

    // itemsSnapshot se guarda desde la entrega al momento de entregar, así
    // que no se desalinea si la docente edita la actividad después. Las
    // entregas de antes de este cambio no lo tienen — para esas, mejor
    // esfuerzo contra el contenido actual (puede desalinearse si cambió).
    let items: { texto: string; correcta: string }[];
    if (respuesta?.itemsSnapshot?.length) {
      items = respuesta.itemsSnapshot;
    } else {
      const contenido = act.contenido as {
        elementos?: { texto: string; categoria_correcta: string }[];
        fragmentos?: { texto: string; etiqueta_correcta: string }[];
      };
      items = (contenido.elementos ?? contenido.fragmentos ?? []).map((it) => ({
        texto: it.texto,
        correcta: "categoria_correcta" in it ? it.categoria_correcta : it.etiqueta_correcta,
      }));
    }

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

  // Evaluación cualitativa: lo que la docente ya juzgó en entregas abiertas
  // (opción-justificación, encontrar-corregir, comparador, etc.).
  const evaluacionDistribucion = { logrado: 0, en_proceso: 0, necesita_apoyo: 0 };
  for (const en of entregas ?? []) {
    if (en.evaluacion_docente) {
      evaluacionDistribucion[en.evaluacion_docente as keyof typeof evaluacionDistribucion] += 1;
    }
  }
  const totalEvaluadas =
    evaluacionDistribucion.logrado + evaluacionDistribucion.en_proceso + evaluacionDistribucion.necesita_apoyo;

  const alertas: string[] = [];
  for (const e of porEstudiante) {
    if (e.totalEntregas === 0) {
      const diasDesdeAlta = Math.floor((hoy - new Date(e.created_at).getTime()) / (1000 * 60 * 60 * 24));
      if (diasDesdeAlta >= 3) alertas.push(`${e.nombre} todavía no ha empezado a practicar.`);
    } else if (e.diasInactivo !== null && e.diasInactivo > DIAS_INACTIVIDAD) {
      alertas.push(`${e.nombre} sin actividad hace ${e.diasInactivo} días.`);
    }
  }
  for (const c of confianzas ?? []) {
    if (c.momento !== "inicio") continue;
    const est = porEstudiante.find((e) => e.id === c.estudiante_id);
    if (!est) continue;
    if (c.valor >= 70 && est.totalEntregas === 0) {
      alertas.push(`${est.nombre} dice sentirse seguro pero no ha completado actividades.`);
      continue;
    }
    if (c.valor >= 70 && est.totalEntregas > 0) {
      const misPuntajes = (entregas ?? []).filter(
        (en) => en.estudiante_id === est.id && en.puntaje_auto !== null,
      );
      if (misPuntajes.length > 0) {
        const promedio = misPuntajes.reduce((s, en) => s + (en.puntaje_auto ?? 0), 0) / misPuntajes.length;
        if (promedio < 50) {
          alertas.push(
            `${est.nombre} dice sentirse seguro pero su precisión real es de ${Math.round(promedio)}%.`,
          );
        }
      }
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <PageHeader
        volverHref="/docente/dashboard"
        titulo={grupo.nombre}
        descripcion={
          <>
            Código de acceso:{" "}
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {grupo.codigo_acceso}
            </span>
          </>
        }
        accion={<EditarGrupo grupoId={grupo.id} nombreActual={grupo.nombre} codigoActual={grupo.codigo_acceso} />}
      />

      <nav className="sticky top-0 z-10 -mx-6 flex gap-1 border-b border-slate-200 bg-slate-50/95 px-6 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        {[
          { href: "#resumen", etiqueta: "Resumen" },
          { href: "#estudiantes", etiqueta: "Estudiantes" },
          { href: "#contenido", etiqueta: "Contenido" },
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
          etiqueta="Por revisar"
          valor={entregasPorRevisar.length}
          icon={ClipboardCheck}
          tono="amber"
        />
        <MetricCard etiqueta="Estudiantes" valor={estudiantes?.length ?? 0} icon={Users} tono="slate" />
      </div>

      {alertas.length > 0 && (
        <Alert tono="warning" titulo="Alertas">
          <ul className="flex flex-col gap-1">
            {alertas.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </Alert>
      )}

      <section className="flex flex-col gap-3">
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
            Dónde se equivoca el grupo
          </h2>
          <Card className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {confusionesTop.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="text-slate-700 dark:text-slate-300">
                  <strong className="font-medium text-slate-900 dark:text-slate-50">"{c.elemento}"</strong> se
                  confunde con <strong className="font-medium text-amber-600 dark:text-amber-400">{c.elegida}</strong>{" "}
                  <span className="text-slate-500 dark:text-slate-400">(era {c.correcta})</span>
                </span>
                <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {c.veces} {c.veces === 1 ? "vez" : "veces"}
                </span>
              </div>
            ))}
          </Card>
        </section>
      )}

      {totalEvaluadas > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Evaluación cualitativa de la docente
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <MetricCard etiqueta="Logrado" valor={evaluacionDistribucion.logrado} icon={ThumbsUp} tono="emerald" />
            <MetricCard
              etiqueta="En proceso"
              valor={evaluacionDistribucion.en_proceso}
              icon={TrendingUp}
              tono="amber"
            />
            <MetricCard
              etiqueta="Necesita apoyo"
              valor={evaluacionDistribucion.necesita_apoyo}
              icon={ClipboardCheck}
              tono="slate"
            />
          </div>
        </section>
      )}

      {entregasPorRevisar.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Entregas por revisar
          </h2>
          <div className="flex flex-col gap-2">
            {entregasPorRevisar.map((en) => {
              const est = porEstudiante.find((e) => e.id === en.estudiante_id);
              const act = Array.isArray(en.actividades) ? en.actividades[0] : en.actividades;
              return (
                <Link key={en.id} href={`/docente/estudiantes/${en.estudiante_id}#entrega-${en.id}`}>
                  <CardLink className="flex items-center gap-3 px-4 py-3">
                    <span className="size-2 shrink-0 rounded-full bg-amber-400" aria-hidden="true" />
                    <span className="flex-1 text-sm text-slate-900 dark:text-slate-50">
                      <strong className="font-medium">{est?.nombre}</strong> · {act?.titulo}
                    </span>
                    <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Revisar</span>
                  </CardLink>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <div id="contenido" className="scroll-mt-16 flex flex-col gap-8">
        <Eventos grupoId={grupo.id} unidades={unidades ?? []} eventos={eventos ?? []} />
        <Avisos grupoId={grupo.id} avisos={avisos ?? []} />
      </div>

      <div id="estudiantes" className="scroll-mt-16 flex flex-col gap-8">
      <AgregarEstudiantes
        grupoId={grupo.id}
        nombresExistentes={[...(estudiantes ?? []), ...(estudiantesBaja ?? [])].map((e) => e.nombre)}
      />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Estudiantes ({estudiantes?.length ?? 0})
          </h2>
          {estudiantes && estudiantes.length > 0 && (
            <ExportarGrupo nombreGrupo={grupo.nombre} estudiantes={porEstudiante} />
          )}
        </div>
        {!estudiantes || estudiantes.length === 0 ? (
          <EmptyState icon={Users} titulo="Todavía no hay estudiantes en este grupo" />
        ) : (
          <div className="flex flex-col gap-2">
            {porEstudiante.map((e) => (
              <Link key={e.id} href={`/docente/estudiantes/${e.id}`}>
                <CardLink className="flex items-center gap-3 px-4 py-3">
                  <Avatar nombre={e.nombre} size="sm" />
                  <span className="flex-1 text-sm font-medium text-slate-900 dark:text-slate-50">
                    {e.nombre}
                  </span>
                  <div className="flex w-24 items-center gap-2">
                    <ProgressBar porcentaje={e.avance} etiqueta={`Avance de ${e.nombre}: ${e.avance}%`} />
                    <span className="w-8 shrink-0 text-right text-xs text-slate-500 dark:text-slate-500">
                      {e.avance}%
                    </span>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                </CardLink>
              </Link>
            ))}
          </div>
        )}
      </section>

      {estudiantesBaja && estudiantesBaja.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-slate-500 dark:text-slate-500">
            Dados de baja ({estudiantesBaja.length})
          </h2>
          <div className="flex flex-col gap-2">
            {estudiantesBaja.map((e) => (
              <Link key={e.id} href={`/docente/estudiantes/${e.id}`}>
                <CardLink className="flex items-center gap-3 px-4 py-3 opacity-60">
                  <Avatar nombre={e.nombre} size="sm" />
                  <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {e.nombre}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                </CardLink>
              </Link>
            ))}
          </div>
        </section>
      )}

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
