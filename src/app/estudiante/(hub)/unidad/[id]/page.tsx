import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { CheckCircle2, Circle, Lock, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Confianza from "./confianza";
import Bitacora from "./bitacora";
import ReflexionCierre from "./reflexion-cierre";
import PageHeader from "@/components/ui/page-header";
import { CardLink } from "@/components/ui/card";
import ProgressBar from "@/components/ui/progress-bar";
import EmptyState from "@/components/ui/empty-state";
import UnidadCompetenciaTag from "@/components/ui/unidad-competencia-tag";
import { temaUnidad } from "@/lib/unidad-tema";
import { unidadEstaCompleta } from "@/lib/progreso-unidad";

export default async function UnidadEstudiante({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingreso/estudiante");

  const [{ data: estudiante }, { data: unidad }, { data: actividades }] = await Promise.all([
    supabase.from("estudiantes").select("id").eq("auth_user_id", user.id).single(),
    supabase
      .from("unidades")
      .select("id, nombre, orden, reto_comunicativo, unidad_competencia")
      .eq("id", id)
      .single(),
    supabase
      .from("actividades")
      .select("id, titulo, instrucciones, requiere_actividad_id, entregas(id, puntaje_auto)")
      .eq("unidad_id", id)
      .order("orden"),
  ]);
  if (!estudiante) redirect("/ingreso/estudiante");
  if (!unidad) notFound();

  if (unidad.orden > 1) {
    const { data: unidadAnterior } = await supabase
      .from("unidades")
      .select("id, nombre, actividades(id, entregas(id))")
      .eq("orden", unidad.orden - 1)
      .single();

    if (unidadAnterior) {
      const totalAnterior = unidadAnterior.actividades.length;
      const hechasAnterior = unidadAnterior.actividades.filter(
        (a) => Array.isArray(a.entregas) && a.entregas.length > 0,
      ).length;
      const { data: reflexionAnterior } = await supabase
        .from("reflexiones")
        .select("id")
        .eq("estudiante_id", estudiante.id)
        .eq("unidad_id", unidadAnterior.id)
        .eq("momento", "cierre")
        .maybeSingle();

      if (!unidadEstaCompleta(totalAnterior, hechasAnterior) || !reflexionAnterior) {
        return (
          <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-10">
            <PageHeader volverHref="/estudiante/inicio" eyebrow={`Unidad ${unidad.orden}`} titulo={unidad.nombre} />
            <EmptyState
              icon={Lock}
              titulo={`Termina primero la Unidad ${unidad.orden - 1}`}
              descripcion="Completa todas sus actividades y guarda tu reflexión de cierre antes de empezar esta."
              accion={
                <Link
                  href={`/estudiante/unidad/${unidadAnterior.id}`}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  Ir a la Unidad {unidad.orden - 1} →
                </Link>
              }
            />
          </div>
        );
      }
    }
  }

  const [{ data: confianzas }, { data: bitacora }, { data: reflexionCierre }] = await Promise.all([
    supabase
      .from("autoevaluaciones_confianza")
      .select("momento, valor")
      .eq("estudiante_id", estudiante.id)
      .eq("unidad_id", id),
    supabase
      .from("bitacora")
      .select("meta, cumplida")
      .eq("estudiante_id", estudiante.id)
      .eq("unidad_id", id)
      .maybeSingle(),
    supabase
      .from("reflexiones")
      .select("texto")
      .eq("estudiante_id", estudiante.id)
      .eq("unidad_id", id)
      .eq("momento", "cierre")
      .maybeSingle(),
  ]);

  const confianzaInicio = confianzas?.find((c) => c.momento === "inicio");

  const totalActividades = actividades?.length ?? 0;
  const completadas =
    actividades?.filter((a) => Array.isArray(a.entregas) && a.entregas.length > 0)
      .length ?? 0;
  const unidadCompleta = totalActividades > 0 && completadas === totalActividades;
  const pct = totalActividades > 0 ? Math.round((completadas / totalActividades) * 100) : 0;
  const tema = temaUnidad(unidad.orden);

  // Desempeño real de la unidad, para comparar contra la confianza inicial
  // en la reflexión de cierre — se deriva de las mismas entregas ya traídas
  // arriba, sin consulta nueva (solo cuentan las que sí se autocalifican).
  const puntajesAuto = (actividades ?? [])
    .flatMap((a) => (Array.isArray(a.entregas) ? a.entregas : []))
    .map((e) => e.puntaje_auto)
    .filter((p): p is number => p != null);
  const promedioUnidad =
    puntajesAuto.length > 0
      ? Math.round(puntajesAuto.reduce((suma, p) => suma + p, 0) / puntajesAuto.length)
      : null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <PageHeader
        volverHref="/estudiante/inicio"
        eyebrow={`Unidad ${unidad.orden}`}
        titulo={unidad.nombre}
        descripcion={unidad.reto_comunicativo}
      />

      {unidad.unidad_competencia && <UnidadCompetenciaTag texto={unidad.unidad_competencia} />}

      {totalActividades > 0 && (
        <div className="flex items-center gap-3">
          <ProgressBar porcentaje={pct} gradiente={tema.barra} />
          <span className="shrink-0 text-sm font-medium text-slate-500 dark:text-slate-500">
            {completadas}/{totalActividades}
          </span>
        </div>
      )}

      <Bitacora
        estudianteId={estudiante.id}
        unidadId={id}
        metaPrevia={bitacora?.meta ?? null}
        cumplidaPrevia={bitacora?.cumplida ?? false}
        avancePct={pct}
        unidadCompetencia={unidad.unidad_competencia}
      />

      {!confianzaInicio && <Confianza estudianteId={estudiante.id} unidadId={id} />}

      {!actividades || actividades.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          titulo="Todavía no hay actividades publicadas"
          descripcion="Tu profesora las agregará pronto."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {actividades.map((a) => {
            const completada = Array.isArray(a.entregas) && a.entregas.length > 0;
            const prerequisito = a.requiere_actividad_id
              ? actividades.find((p) => p.id === a.requiere_actividad_id)
              : null;
            const entregaPrerequisito = prerequisito?.entregas?.[0];
            const bloqueada = Boolean(
              prerequisito && (!entregaPrerequisito || (entregaPrerequisito.puntaje_auto ?? 0) < 70),
            );

            if (bloqueada) {
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 px-4 py-3.5 opacity-60 dark:border-slate-800"
                >
                  <Lock className="size-5 shrink-0 text-slate-300 dark:text-slate-700" aria-hidden="true" />
                  <span className="flex-1 font-medium text-slate-500 dark:text-slate-500">{a.titulo}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-600">
                    Completa primero: {prerequisito!.titulo}
                  </span>
                </div>
              );
            }

            return (
              <Link key={a.id} href={`/estudiante/actividad/${a.id}`}>
                <CardLink className="flex items-center gap-3 px-4 py-3.5">
                  {completada ? (
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-500" aria-hidden="true" />
                  ) : (
                    <Circle className="size-5 shrink-0 text-slate-300 dark:text-slate-700" aria-hidden="true" />
                  )}
                  <span className="flex-1 font-medium text-slate-900 dark:text-slate-50">
                    {a.titulo}
                  </span>
                  <span
                    className={
                      completada
                        ? "text-xs font-medium text-emerald-600 dark:text-emerald-400"
                        : "text-xs text-slate-500 dark:text-slate-400"
                    }
                  >
                    {completada ? "Completada" : "Sin empezar"}
                  </span>
                </CardLink>
              </Link>
            );
          })}
        </div>
      )}

      {unidadCompleta && (
        <ReflexionCierre
          estudianteId={estudiante.id}
          unidadId={id}
          metaPrevia={bitacora?.meta ?? null}
          textoPrevio={reflexionCierre?.texto ?? null}
          confianzaInicioPct={confianzaInicio?.valor ?? null}
          promedioUnidad={promedioUnidad}
        />
      )}
    </div>
  );
}
