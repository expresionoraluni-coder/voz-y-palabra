import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ChevronRight, ClipboardCheck, TrendingUp, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AgregarEstudiantes from "./agregar-estudiantes";
import Avisos from "./avisos";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/ingreso/profesora");

  const { data: grupo } = await supabase
    .from("grupos")
    .select("id, nombre, codigo_acceso, ciclo_escolar")
    .eq("id", id)
    .single();

  if (!grupo) notFound();

  const [
    { data: estudiantes },
    { data: unidades },
    { data: actividades },
    { data: confianzas },
    { data: avisos },
  ] = await Promise.all([
    supabase.from("estudiantes").select("id, nombre, created_at").eq("grupo_id", id).order("nombre"),
    supabase.from("unidades").select("id, nombre, orden").order("orden"),
    supabase.from("actividades").select("id, unidad_id"),
    supabase.from("autoevaluaciones_confianza").select("estudiante_id, unidad_id, momento, valor"),
    supabase
      .from("avisos")
      .select("id, titulo, mensaje, created_at")
      .eq("grupo_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const idsEstudiantes = estudiantes?.map((e) => e.id) ?? [];
  const { data: entregas } = idsEstudiantes.length
    ? await supabase
        .from("entregas")
        .select("id, estudiante_id, actividad_id, estado, created_at, actividades(titulo, unidad_id)")
        .in("estudiante_id", idsEstudiantes)
    : { data: [] };

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
  const entregasPorRevisar = (entregas ?? []).filter((en) => en.estado === "pendiente_revision");

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
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                <Link key={en.id} href={`/docente/estudiantes/${en.estudiante_id}`}>
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

      <Avisos grupoId={grupo.id} avisos={avisos ?? []} />

      <AgregarEstudiantes grupoId={grupo.id} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          Estudiantes ({estudiantes?.length ?? 0})
        </h2>
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
                    <ProgressBar porcentaje={e.avance} />
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
    </div>
  );
}
