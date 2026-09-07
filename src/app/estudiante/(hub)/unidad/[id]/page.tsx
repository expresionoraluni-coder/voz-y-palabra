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
  if (!user || user.is_anonymous !== true) redirect("/ingreso/estudiante");

  const { data: estudiante, error: estudianteError } = await admin
    .from("estudiantes")
    .select("id, debe_cambiar_nip")
    .eq("auth_user_id", user.id)
    .eq("activo", true)
    .single();
  revisarErrorConsulta(estudianteError && estudianteError.code !== "PGRST116" ? estudianteError : null, "No pudimos cargar tu sesión de estudiante.");
  if (!estudiante) redirect("/ingreso/estudiante");
  if (estudiante.debe_cambiar_nip) return null;

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
    { data: reflexionesActividad, error: reflexionesActividadError },
  ] = await Promise.all([
    admin
      .from("unidades")
      .select("id, nombre, orden, reto_comunicativo, unidad_competencia")
      .eq("id", id)
      .single(),
    admin
      .from("actividades")
      .select("id, titulo, instrucciones, contenido, requiere_actividad_id")
      .eq("unidad_id", id)
      .order("orden"),
    supabase.from("entregas").select("actividad_id, puntaje_auto, respuesta").eq("estudiante_id", estudiante.id),
    supabase
      .from("reflexiones")
      .select("actividad_id")
      .eq("estudiante_id", estudiante.id)
      .eq("momento", "cierre"),
  ]);
  revisarErrorConsulta(unidadError, "No pudimos cargar esta unidad.");
  revisarErrorConsulta(actividadesError, "No pudimos cargar las actividades de esta unidad.");
  revisarErrorConsulta(entregasError, "No pudimos cargar tu avance en esta unidad.");
  revisarErrorConsulta(reflexionesActividadError, "No pudimos cargar tus reflexiones de actividad.");
  if (!unidad) notFound();

  const entregasPorActividad = new Map((entregasEstudiante ?? []).map((e) => [e.actividad_id, e]));
  const actividadesConReflexion = new Set(
    (reflexionesActividad ?? [])
      .map((reflexion) => reflexion.actividad_id)
      .filter((actividadId): actividadId is string => typeof actividadId === "string"),
  );
  const actividades = (actividadesRaw ?? []).map((a) => {
    const entrega = entregasPorActividad.get(a.id);
    return {
      ...a,
      entregas: entrega ? [{ puntaje_auto: entrega.puntaje_auto, respuesta: entrega.respuesta }] : [],
    };
  });

  if (unidad.orden > 1) {
      const { data: unidadAnterior, error: unidadAnteriorError } = await admin
      .from("unidades")
      .select("id, nombre, actividades(id, orden, contenido)")
      .eq("orden", unidad.orden - 1)
      .single();
    revisarErrorConsulta(unidadAnteriorError, "No pudimos comprobar el avance de la unidad anterior.");

    if (unidadAnterior) {
      const totalAnterior = unidadAnterior.actividades.length;
      const hechasAnterior = unidadAnterior.actividades.filter((a) =>
        (entregasEstudiante ?? []).some(
          (e) => e.actividad_id === a.id && entregaCuentaComoCompletada(e, a.contenido),
        ),
      ).length;
      const reflexionadasAnterior = unidadAnterior.actividades.filter((a) =>
        actividadesConReflexion.has(a.id),
      ).length;
      const [
        { data: reflexionAnterior, error: reflexionAnteriorError },
        { data: confianzaAnterior, error: confianzaAnteriorError },
      ] = await Promise.all([
        supabase
          .from("reflexiones")
          .select("id")
          .eq("estudiante_id", estudiante.id)
          .eq("unidad_id", unidadAnterior.id)
          .eq("momento", "cierre")
          .maybeSingle(),
        supabase
          .from("autoevaluaciones_confianza")
          .select("id")
          .eq("estudiante_id", estudiante.id)
          .eq("unidad_id", unidadAnterior.id)
          .eq("momento", "cierre")
          .maybeSingle(),
      ]);
      revisarErrorConsulta(reflexionAnteriorError, "No pudimos comprobar el cierre de la unidad anterior.");
      revisarErrorConsulta(confianzaAnteriorError, "No pudimos comprobar la confianza final de la unidad anterior.");
      const motivoUnidadAnterior = !unidadEstaCompleta(totalAnterior, hechasAnterior)
        ? "unidad_anterior_actividades"
        : !unidadEstaCompleta(totalAnterior, reflexionadasAnterior)
          ? "unidad_anterior_reflexion_actividad"
          : !reflexionAnterior
            ? "unidad_anterior_reflexion_unidad"
            : !confianzaAnterior
              ? "unidad_anterior_confianza"
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
  ]);

  revisarErrorConsulta(confianzasError, "No pudimos cargar tu nivel de seguridad.");
  revisarErrorConsulta(bitacoraError, "No pudimos cargar tu meta de unidad.");
  revisarErrorConsulta(reflexionCierreError, "No pudimos cargar tu reflexión de cierre.");

  const confianzaInicio = confianzas?.find((c) => c.momento === "inicio");
  const inicioUnidadCompleto = Boolean(confianzaInicio && bitacora);

  const totalActividades = actividades.length;
  const completadas =
    actividades.filter((a) => entregaCuentaComoCompletada(a.entregas?.[0], a.contenido)).length;
  const unidadCompleta = unidadEstaCompleta(totalActividades, completadas);
  const primeraReflexionPendiente = actividades.find(
    (actividad) =>
      entregaCuentaComoCompletada(actividad.entregas?.[0], actividad.contenido) &&
      !actividadesConReflexion.has(actividad.id),
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

      {!inicioUnidadCompleto ? (
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
            unidadId={id}
            metaPrevia={bitacora?.meta ?? null}
            cumplidaPrevia={bitacora?.cumplida ?? false}
            avancePct={pct}
          />
          <Confianza unidadId={id} />
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
              <span className="shrink-0 text-sm font-medium text-slate-500 dark:text-slate-400">
                {completadas}/{totalActividades}
              </span>
            </div>
          )}

          {detalleBloqueo && (
            <Alert tono="warning" titulo={detalleBloqueo.titulo}>
              <p>{detalleBloqueo.descripcion}</p>
            </Alert>
          )}

          {actividades.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              titulo="Todavía no hay actividades publicadas"
              descripcion="Las actividades aparecerán aquí cuando estén disponibles."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {actividades.map((a, indice) => {
                const completada = entregaCuentaComoCompletada(a.entregas?.[0], a.contenido);
                const reflexionada = actividadesConReflexion.has(a.id);
                const idsPrerequisito = Array.from(
                  new Set(
                    [...actividades.slice(0, indice).map((anterior) => anterior.id), a.requiere_actividad_id].filter(
                      (actividadId): actividadId is string => typeof actividadId === "string",
                    ),
                  ),
                );
                const requisitoSinEntrega = idsPrerequisito.find((actividadId) =>
                  !entregaCuentaComoCompletada(
                    entregasPorActividad.get(actividadId),
                    actividades.find((actividad) => actividad.id === actividadId)?.contenido,
                  ),
                );
                const requisitoSinReflexion = idsPrerequisito.find(
                  (actividadId) => !actividadesConReflexion.has(actividadId),
                );
                const requisitoBloqueado = requisitoSinEntrega ?? requisitoSinReflexion;
                const actividadBloqueada = requisitoBloqueado
                  ? actividades.find((actividad) => actividad.id === requisitoBloqueado)
                  : null;
                const bloqueada = Boolean(requisitoBloqueado);
                if (bloqueada) {
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 px-4 py-3.5 opacity-60 dark:border-slate-800"
                    >
                      <Lock className="size-5 shrink-0 text-slate-300 dark:text-slate-700" aria-hidden="true" />
                      <span className="flex-1 font-medium text-slate-500 dark:text-slate-400">{a.titulo}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-600">
                        {requisitoSinEntrega ? "Primero completa" : "Primero guarda la reflexión de"}: {actividadBloqueada?.titulo ?? "la actividad anterior"}
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
                        {completada
                          ? reflexionada
                            ? "Completada"
                            : "Reflexión pendiente"
                          : "Lista para comenzar"}
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
                    {primeraReflexionPendiente
                      ? "Antes del cierre, guarda la reflexión de cada actividad pendiente."
                      : reflexionCierre
                      ? "Tu cierre está guardado. Puedes volver a leerlo o continuar con la siguiente unidad."
                      : "Ahora puedes cerrar la unidad con una pausa final."}
                  </p>
                </div>
              </div>
              <Link
                href={
                  primeraReflexionPendiente
                    ? `/estudiante/actividad/${primeraReflexionPendiente.id}`
                    : `/estudiante/unidad/${id}/cierre`
                }
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
              >
                {primeraReflexionPendiente
                  ? "Completar reflexión pendiente"
                  : reflexionCierre
                    ? "Ver cierre de la unidad"
                    : "Escribir reflexión de cierre"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
