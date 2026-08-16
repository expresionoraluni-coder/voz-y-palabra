import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, Circle, Lock, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Confianza from "./confianza";
import Bitacora from "./bitacora";
import PageHeader from "@/components/ui/page-header";
import { Card, CardLink } from "@/components/ui/card";
import ProgressBar from "@/components/ui/progress-bar";
import EmptyState from "@/components/ui/empty-state";
import Alert from "@/components/ui/alert";
import UnidadCompetenciaTag from "@/components/ui/unidad-competencia-tag";
import { temaUnidad } from "@/lib/unidad-tema";
import {
  detalleBloqueoActividad,
  entregaCuentaComoCompletada,
  intentosDeEntregaAuto,
  unidadEstaCompleta,
} from "@/lib/progreso-unidad";
import { revisarErrorConsulta } from "@/lib/revisar-error-consulta";

export default async function UnidadEstudiante({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ bloqueada?: string }>;
}) {
  const { id } = await params;
  const { bloqueada } = await searchParams;
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingreso/estudiante");

  const { data: estudiante, error: estudianteError } = await supabase
    .from("estudiantes")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();
  revisarErrorConsulta(estudianteError && estudianteError.code !== "PGRST116" ? estudianteError : null, "No pudimos cargar tu sesión de estudiante.");
  if (!estudiante) redirect("/ingreso/estudiante");

  // `unidades`/`actividades` ya no tienen policy de lectura abierta a
  // estudiantes — se traen con el cliente admin. Las entregas del propio
  // estudiante se traen aparte con el cliente de SESIÓN (filtradas por RLS
  // a sus propias filas) y se combinan en JS — si se pidieran embebidas en
  // la consulta admin, el cliente admin ignora RLS y traería las entregas
  // de todo el grupo, no solo las propias.
  const [
    { data: unidad, error: unidadError },
    { data: actividadesRaw, error: actividadesError },
    { data: entregasEstudiante, error: entregasError },
  ] = await Promise.all([
    admin
      .from("unidades")
      .select("id, nombre, orden, reto_comunicativo, unidad_competencia")
      .eq("id", id)
      .single(),
    admin
      .from("actividades")
      .select("id, titulo, instrucciones, requiere_actividad_id")
      .eq("unidad_id", id)
      .order("orden"),
    supabase.from("entregas").select("actividad_id, puntaje_auto, respuesta").eq("estudiante_id", estudiante.id),
  ]);
  revisarErrorConsulta(unidadError, "No pudimos cargar esta unidad.");
  revisarErrorConsulta(actividadesError, "No pudimos cargar las actividades de esta unidad.");
  revisarErrorConsulta(entregasError, "No pudimos cargar tu avance en esta unidad.");
  if (!unidad) notFound();

  const entregasPorActividad = new Map((entregasEstudiante ?? []).map((e) => [e.actividad_id, e]));
  const actividades = actividadesRaw?.map((a) => {
    const entrega = entregasPorActividad.get(a.id);
    return {
      ...a,
      entregas: entrega ? [{ puntaje_auto: entrega.puntaje_auto, respuesta: entrega.respuesta }] : [],
    };
  });

  if (unidad.orden > 1) {
    const { data: unidadAnterior, error: unidadAnteriorError } = await admin
      .from("unidades")
      .select("id, nombre, actividades(id, orden)")
      .eq("orden", unidad.orden - 1)
      .single();
    revisarErrorConsulta(unidadAnteriorError, "No pudimos comprobar el avance de la unidad anterior.");

    if (unidadAnterior) {
      const totalAnterior = unidadAnterior.actividades.length;
      const hechasAnterior = unidadAnterior.actividades.filter((a) =>
        (entregasEstudiante ?? []).some((e) => e.actividad_id === a.id && entregaCuentaComoCompletada(e)),
      ).length;
      const { data: reflexionAnterior, error: reflexionAnteriorError } = await supabase
        .from("reflexiones")
        .select("id")
        .eq("estudiante_id", estudiante.id)
        .eq("unidad_id", unidadAnterior.id)
            .eq("momento", "cierre")
            .maybeSingle();
      revisarErrorConsulta(reflexionAnteriorError, "No pudimos comprobar el cierre de la unidad anterior.");
      const ultimaActividadAnterior = unidadAnterior.actividades.slice().sort((a, b) => b.orden - a.orden)[0];
      const { data: reflexionUltimaActividadAnterior, error: reflexionUltimaActividadAnteriorError } = ultimaActividadAnterior
        ? await supabase
            .from("reflexiones")
            .select("id")
            .eq("estudiante_id", estudiante.id)
            .eq("actividad_id", ultimaActividadAnterior.id)
            .eq("momento", "cierre")
            .maybeSingle()
        : { data: null };
      revisarErrorConsulta(
        reflexionUltimaActividadAnteriorError,
        "No pudimos comprobar la reflexión de la última actividad.",
      );

      const motivoUnidadAnterior = !unidadEstaCompleta(totalAnterior, hechasAnterior)
        ? "unidad_anterior_actividades"
        : !reflexionUltimaActividadAnterior && !reflexionAnterior
          ? "unidad_anterior_reflexiones"
          : !reflexionUltimaActividadAnterior
            ? "unidad_anterior_reflexion_actividad"
            : !reflexionAnterior
              ? "unidad_anterior_reflexion_unidad"
              : null;

      if (motivoUnidadAnterior) {
        const detalle = detalleBloqueoActividad(motivoUnidadAnterior);
        return (
          <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-6 py-10">
            <PageHeader volverHref="/estudiante/inicio" eyebrow={`Unidad ${unidad.orden}`} titulo={unidad.nombre} />
            <EmptyState
              icon={Lock}
              titulo={`Termina primero la Unidad ${unidad.orden - 1}`}
              descripcion={detalle?.descripcion ?? "Completa el recorrido pendiente antes de empezar esta unidad."}
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

  const [
    { data: confianzas, error: confianzasError },
    { data: bitacora, error: bitacoraError },
    { data: reflexionCierre, error: reflexionCierreError },
    { data: reflexionesActividades, error: reflexionesActividadesError },
  ] = await Promise.all([
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
    supabase
      .from("reflexiones")
      .select("actividad_id")
      .eq("estudiante_id", estudiante.id)
      .eq("momento", "cierre")
        .in("actividad_id", (actividadesRaw ?? []).map((a) => a.id)),
  ]);

  revisarErrorConsulta(confianzasError, "No pudimos cargar tu nivel de seguridad.");
  revisarErrorConsulta(bitacoraError, "No pudimos cargar tu meta de unidad.");
  revisarErrorConsulta(reflexionCierreError, "No pudimos cargar tu reflexión de cierre.");
  revisarErrorConsulta(reflexionesActividadesError, "No pudimos cargar las reflexiones de tus actividades.");

  const confianzaInicio = confianzas?.find((c) => c.momento === "inicio");
  const actividadesConReflexion = new Set((reflexionesActividades ?? []).map((reflexion) => reflexion.actividad_id));

  const totalActividades = actividades?.length ?? 0;
  const completadas =
    actividades?.filter((a) => entregaCuentaComoCompletada(a.entregas?.[0]))
      .length ?? 0;
  const unidadCompleta = totalActividades > 0 && completadas === totalActividades;
  const ultimaActividad = actividades?.[actividades.length - 1];
  const tieneReflexionUltimaActividad = Boolean(
    ultimaActividad && (reflexionesActividades ?? []).some((reflexion) => reflexion.actividad_id === ultimaActividad.id),
  );
  const pct = totalActividades > 0 ? Math.round((completadas / totalActividades) * 100) : 0;
  const tema = temaUnidad(unidad.orden);
  const detalleBloqueo = detalleBloqueoActividad(bloqueada);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <PageHeader
        volverHref="/estudiante/inicio"
        eyebrow={`Unidad ${unidad.orden}`}
        titulo={unidad.nombre}
        descripcion={unidad.reto_comunicativo}
      />

      {!confianzaInicio ? (
        <>
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3.5 dark:border-indigo-900 dark:bg-indigo-950/30">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Tu ruta para aprender</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Primero define qué quieres lograr y reconoce con qué conocimientos comienzas. Después podrás avanzar por las actividades a tu propio ritmo.
            </p>
          </div>
          {unidad.unidad_competencia && <UnidadCompetenciaTag texto={unidad.unidad_competencia} />}
          {detalleBloqueo && (
            <Alert tono="warning" titulo={detalleBloqueo.titulo}>
              <p>{detalleBloqueo.descripcion}</p>
            </Alert>
          )}
          <Bitacora
            estudianteId={estudiante.id}
            unidadId={id}
            metaPrevia={bitacora?.meta ?? null}
            cumplidaPrevia={bitacora?.cumplida ?? false}
            avancePct={pct}
          />
          <Confianza estudianteId={estudiante.id} unidadId={id} />
        </>
      ) : (
        <>
          {totalActividades > 0 && (
            <div className="flex items-center gap-3">
              <ProgressBar
                porcentaje={pct}
                gradiente={tema.barra}
                etiqueta={`Unidad: ${completadas} de ${totalActividades} actividades`}
              />
              <span className="shrink-0 text-sm font-medium text-slate-500 dark:text-slate-500">
                {completadas}/{totalActividades}
              </span>
            </div>
          )}

          {detalleBloqueo && (
            <Alert tono="warning" titulo={detalleBloqueo.titulo}>
              <p>{detalleBloqueo.descripcion}</p>
            </Alert>
          )}

          {!actividades || actividades.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              titulo="Todavía no hay actividades publicadas"
              descripcion="Las actividades aparecerán aquí cuando estén disponibles."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {actividades.map((a) => {
                const completada = entregaCuentaComoCompletada(a.entregas?.[0]);
                const prerequisito = a.requiere_actividad_id
                  ? actividades.find((p) => p.id === a.requiere_actividad_id)
                  : null;
                const entregaPrerequisito = prerequisito?.entregas?.[0];
                const bloqueada = Boolean(
                  prerequisito &&
                    (!entregaPrerequisito ||
                      !entregaCuentaComoCompletada(entregaPrerequisito) ||
                      !actividadesConReflexion.has(prerequisito.id)),
                );
                const puntajeActual = completada ? (a.entregas?.[0]?.puntaje_auto ?? null) : null;
                const intentosActuales = intentosDeEntregaAuto(a.entregas?.[0]?.respuesta, completada);
                const puedeRepasar = Boolean(
                  completada && puntajeActual !== null && puntajeActual < 70 && intentosActuales < 3,
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
                        Primero completa: {prerequisito!.titulo}
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
                        {puedeRepasar ? "Puedes mejorarla" : completada ? "Completada" : "Lista para comenzar"}
                      </span>
                    </CardLink>
                  </Link>
                );
              })}
            </div>
          )}

          {unidadCompleta && (
            <Card className="flex flex-col gap-3 border-indigo-100 bg-indigo-50/60 p-5 dark:border-indigo-900 dark:bg-indigo-950/30">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Actividades terminadas</p>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {tieneReflexionUltimaActividad
                      ? reflexionCierre
                        ? "Tu cierre está guardado. Puedes volver a leerlo o continuar con la siguiente unidad."
                        : "La última reflexión está lista. Ahora puedes cerrar la unidad con una pausa final."
                      : "Antes del cierre, guarda la reflexión de tu última actividad para completar tu recorrido."}
                  </p>
                </div>
              </div>
              <Link
                href={
                  tieneReflexionUltimaActividad
                    ? `/estudiante/unidad/${id}/cierre`
                    : ultimaActividad
                      ? `/estudiante/actividad/${ultimaActividad.id}`
                      : `/estudiante/unidad/${id}`
                }
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
              >
                {tieneReflexionUltimaActividad
                  ? reflexionCierre
                    ? "Ver cierre de la unidad"
                    : "Escribir reflexión de cierre"
                  : "Volver a la última actividad"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
