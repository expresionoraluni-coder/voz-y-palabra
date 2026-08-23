import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AvisoSinConexion from "@/components/ui/aviso-sin-conexion";
import ReportarProblema from "@/components/reportar-problema";
import CambiarNipObligatorio from "@/components/cambiar-nip-obligatorio";
import PageHeader from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import ProgressBar from "@/components/ui/progress-bar";
import UnidadCompetenciaTag from "@/components/ui/unidad-competencia-tag";
import {
  type ContenidoOpcionJustificacion,
  sanitizarContenido as sanitizarContenidoOpcionJustificacion,
} from "@/lib/opcion-justificacion";
import { EntregaRecienteProvider } from "@/lib/entrega-reciente-context";
import VideoIntro from "./video-intro";
import OpcionJustificacion from "./opcion-justificacion";
import Clasificacion from "./clasificacion";
import Comparador from "./comparador";
import RedaccionChecklist from "./redaccion-checklist";
import RedaccionLectura from "./redaccion-lectura";
import EtiquetadoTexto from "./etiquetado-texto";
import ActividadPostEntrega from "./actividad-post-entrega";
import Prediccion from "./prediccion";
import OrdenarFragmentos from "./ordenar-fragmentos";
import EvaluarVideos from "./evaluar-videos";
import CorregirOrtografia from "./corregir-ortografia";
import ActividadOrientacion from "./actividad-orientacion";
import MomentoActividad from "./momento-actividad";
import { esTipoActividadActual } from "@/lib/tipos-actividad-actuales";
import { sanitizarContenidoEvaluarVideos, type ContenidoEvaluarVideos } from "@/lib/calificacion-evaluar-videos";
import { sanitizarContenidoOrdenarFragmentos, type ContenidoOrdenarFragmentos } from "@/lib/calificacion-ordenar-fragmentos";
import { sanitizarContenidoComparador, type ContenidoComparador } from "@/lib/calificacion-comparador";
import { sanitizarContenidoClasificacion, type ContenidoClasificacion } from "@/lib/calificacion-clasificacion";
import { sanitizarContenidoEtiquetadoTexto, type ContenidoEtiquetadoTexto } from "@/lib/calificacion-etiquetado-texto";
import { sanitizarContenidoOrtografia, type ContenidoOrtografia } from "@/lib/comparar-ortografia";
import { sanitizarRespuestaParaEstudiante, validarAccesoActividad } from "@/lib/estudiante-entregas-server";
import { entregaCuentaComoCompletada } from "@/lib/progreso-unidad";
import { revisarErrorConsulta } from "@/lib/revisar-error-consulta";
import { instruccionesMomentosDeContenido } from "@/lib/instrucciones-momentos";

export default async function ActividadEstudiante({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingreso/estudiante");
  if (user.is_anonymous !== true) redirect("/ingreso/estudiante");

  // `actividades`/`unidades` ya no tienen ninguna policy de lectura abierta
  // a estudiantes (RLS cerrado) — el contenido, incluida la clave de
  // calificación, solo se trae del lado del servidor con el cliente admin,
  // nunca con el JWT de sesión del estudiante.
  const [
    { data: estudiante, error: estudianteError },
    { data: actividad, error: actividadError },
  ] = await Promise.all([
    admin
      .from("estudiantes")
      .select("id, grupo_id, debe_cambiar_nip")
      .eq("auth_user_id", user.id)
      .eq("activo", true)
      .single(),
    admin
      .from("actividades")
      .select(
        "id, unidad_id, orden, titulo, instrucciones, contenido, aprendizaje_esperado, video_url, requiere_actividad_id, tipos_actividad(nombre), unidades(orden, unidad_competencia)",
      )
      .eq("id", id)
      .single(),
  ]);
  revisarErrorConsulta(estudianteError && estudianteError.code !== "PGRST116" ? estudianteError : null, "No pudimos cargar tu sesión de estudiante.");
  revisarErrorConsulta(actividadError, "No pudimos cargar esta actividad.");
  if (!estudiante) redirect("/ingreso/estudiante");
  if (estudiante.debe_cambiar_nip) return <CambiarNipObligatorio />;
  if (!actividad) notFound();

  const unidadParaAcceso = Array.isArray(actividad.unidades) ? actividad.unidades[0] : actividad.unidades;
  const acceso = await validarAccesoActividad(supabase, admin, estudiante.id, {
    id: actividad.id,
    unidadId: actividad.unidad_id,
    requiereActividadId: actividad.requiere_actividad_id,
    unidadOrden: Number(unidadParaAcceso?.orden ?? 1),
  });
  if (!acceso.ok) redirect(`/estudiante/unidad/${actividad.unidad_id}?bloqueada=${acceso.motivo}`);

  const tipo = Array.isArray(actividad.tipos_actividad)
    ? actividad.tipos_actividad[0]
    : actividad.tipos_actividad;
  const nombreTipo = tipo?.nombre;
  if (!esTipoActividadActual(nombreTipo)) notFound();
  const unidadDeActividad = Array.isArray(actividad.unidades) ? actividad.unidades[0] : actividad.unidades;
  const modoRedaccion = (actividad.contenido as { modo?: string } | null)?.modo;
  const ayudaActividad = (actividad.contenido as { _ayuda?: string } | null)?._ayuda;
  const instruccionesMomentos = instruccionesMomentosDeContenido(actividad.contenido, actividad.instrucciones);

  const [
    { data: entregaExistente, error: entregaError },
    { data: prediccionExistente, error: prediccionError },
    { data: reflexionExistente, error: reflexionError },
    { data: actividadesDeUnidad, error: actividadesDeUnidadError },
    { data: entregasDeUnidad, error: entregasDeUnidadError },
  ] = await Promise.all([
    admin
      .from("entregas")
      .select("respuesta, puntaje_auto, estado")
      .eq("actividad_id", id)
      .eq("estudiante_id", estudiante.id)
      .maybeSingle(),
    admin
      .from("reflexiones")
      .select("confianza")
      .eq("actividad_id", id)
      .eq("estudiante_id", estudiante.id)
      .eq("momento", "prediccion")
      .maybeSingle(),
    admin
      .from("reflexiones")
      .select("texto")
      .eq("actividad_id", id)
      .eq("estudiante_id", estudiante.id)
      .eq("momento", "cierre")
      .maybeSingle(),
    admin
      .from("actividades")
      .select("id, orden, requiere_actividad_id")
      .eq("unidad_id", actividad.unidad_id)
      .order("orden"),
    // Las entregas de las actividades hermanas se traen aparte y se filtran
    // explícitamente por el estudiante validado; así el cliente admin no
    // puede mezclar datos de otro estudiante aunque omita RLS.
    admin
      .from("entregas")
      .select("actividad_id, puntaje_auto, respuesta")
      .eq("estudiante_id", estudiante.id),
  ]);

  revisarErrorConsulta(entregaError, "No pudimos cargar tu entrega.");
  revisarErrorConsulta(prediccionError, "No pudimos cargar tu nivel de seguridad.");
  revisarErrorConsulta(reflexionError, "No pudimos cargar tu reflexión.");
  revisarErrorConsulta(actividadesDeUnidadError, "No pudimos cargar la ruta de actividades.");
  revisarErrorConsulta(entregasDeUnidadError, "No pudimos cargar tu avance en la unidad.");

  // Misma forma que antes (`entregas(puntaje_auto)` embebido), reconstruida
  // en JS a partir de las dos consultas separadas de arriba.
  const entregasPorActividad = new Map(
    (entregasDeUnidad ?? []).map((e) => [
      e.actividad_id,
      { ...e, respuesta: sanitizarRespuestaParaEstudiante(e.respuesta) },
    ]),
  );
  const hermanas = actividadesDeUnidad?.map((a) => ({
    ...a,
    entregas: entregasPorActividad.has(a.id)
      ? [{
          puntaje_auto: entregasPorActividad.get(a.id)!.puntaje_auto,
          respuesta: entregasPorActividad.get(a.id)!.respuesta,
        }]
      : [],
  }));

  const respuesta = sanitizarRespuestaParaEstudiante(entregaExistente?.respuesta);
  const siguiente = hermanas?.find((a) => a.orden > actividad.orden);
  const siguientePrerequisito = siguiente?.requiere_actividad_id
    ? hermanas?.find((a) => a.id === siguiente.requiere_actividad_id)
    : null;
  const entregaSiguientePrerequisito = siguientePrerequisito?.entregas?.[0];
  const siguienteDependenciaListaTrasEntrega = Boolean(
    siguiente &&
      (!siguiente.requiere_actividad_id ||
        siguiente.requiere_actividad_id === actividad.id ||
        (entregaSiguientePrerequisito && entregaCuentaComoCompletada(entregaSiguientePrerequisito))),
  );
  const entregaActual = entregaExistente
    ? { puntaje_auto: entregaExistente.puntaje_auto, respuesta }
    : null;
  const actividadActualLista = entregaCuentaComoCompletada(entregaActual);
  const reflexionActualGuardada = Boolean(reflexionExistente?.texto?.trim());
  const siguienteDisponible = Boolean(
    siguiente &&
      actividadActualLista &&
      reflexionActualGuardada &&
      (!siguiente.requiere_actividad_id ||
        (entregaSiguientePrerequisito &&
          entregaCuentaComoCompletada(entregaSiguientePrerequisito))),
  );
  // "Dos niveles": esta actividad requiere a otra (es el nivel 2) o alguna
  // otra la requiere a ella (es el nivel 1 que la desbloquea) — en ambos
  // casos se oculta la respuesta correcta y se permite reiniciar, para que
  // el par siga siendo un filtro real y no algo que se memoriza una vez.
  const esDosNiveles =
    !!actividad.requiere_actividad_id || !!hermanas?.some((h) => h.requiere_actividad_id === actividad.id);

  // Navegación anterior/siguiente entre actividades de la unidad, visible
  // desde que se entra (no solo tras entregar, a diferencia del botón de
  // abajo) — si el destino es un nivel 2 todavía bloqueado, el guard del
  // inicio de esta misma página ya se encarga de redirigir con su mensaje.
  const indiceActual = hermanas?.findIndex((h) => h.id === actividad.id) ?? -1;
  const actividadAnterior = indiceActual > 0 ? hermanas![indiceActual - 1] : null;
  const porcentajeUnidad = hermanas && indiceActual >= 0 ? Math.round(((indiceActual + 1) / hermanas.length) * 100) : 0;

  const bloqueAeUc = unidadDeActividad?.unidad_competencia && (
    <UnidadCompetenciaTag texto={unidadDeActividad.unidad_competencia} />
  );

  // La pregunta de confianza va ANTES del video (y solo se muestra una vez,
  // nunca vuelve a aparecer tras contestarla) — el video, en cambio, es un
  // paso que sí se repite en cada visita (VideoIntro guarda "ya lo vi" en
  // estado local de React, no en la base), así que debe quedar DESPUÉS de
  // la pregunta para que un reingreso posterior (predicción ya contestada)
  // muestre el video de nuevo sin volver a preguntar.
  const contenidoActividad = (
    <MomentoActividad
      numero={3}
      titulo="Resuelve la actividad"
      instruccion={instruccionesMomentos.actividad}
    >
      <>
        <Card className="p-5 sm:p-6">
      {nombreTipo === "opcion_justificacion" && (
        <OpcionJustificacion
          actividadId={actividad.id}
          estudianteId={estudiante.id}
          contenido={sanitizarContenidoOpcionJustificacion(actividad.contenido as ContenidoOpcionJustificacion)}
          respuestaPrevia={respuesta as Record<string, unknown> | undefined}
          puntajeAuto={entregaExistente?.puntaje_auto ?? null}
        />
      )}
      {nombreTipo === "clasificacion" && (
        <Clasificacion
          actividadId={actividad.id}
          estudianteId={estudiante.id}
          contenido={sanitizarContenidoClasificacion(actividad.contenido as ContenidoClasificacion)}
          respuestaPrevia={
            respuesta as { elegidas: string[]; resultado?: boolean[] } | undefined
          }
          puntajeAuto={entregaExistente?.puntaje_auto ?? null}
          dosNiveles={esDosNiveles}
        />
      )}
      {nombreTipo === "comparador" && (
        <Comparador
          actividadId={actividad.id}
          estudianteId={estudiante.id}
          contenido={sanitizarContenidoComparador(actividad.contenido as ContenidoComparador)}
          respuestaPrevia={
            respuesta as { celdas: string[][]; resultadoCeldas?: boolean[][] } | undefined
          }
          puntajeAuto={entregaExistente?.puntaje_auto ?? null}
        />
      )}
      {nombreTipo === "redaccion_checklist" && modoRedaccion === "leer_reflexionar" && (
        <RedaccionLectura
          actividadId={actividad.id}
          estudianteId={estudiante.id}
          contenido={
            actividad.contenido as {
              texto_fuente: string | null;
              titulo_fuente?: string | null;
              ejemplo_resumen: string;
              ejemplo_sintesis: string;
              ejemplo_parafrasis: string;
            }
          }
          respuestaPrevia={respuesta as Record<string, unknown> | undefined}
        />
      )}
      {nombreTipo === "redaccion_checklist" && modoRedaccion !== "leer_reflexionar" && (
        <RedaccionChecklist
          actividadId={actividad.id}
          estudianteId={estudiante.id}
          contenido={
            actividad.contenido as {
              texto_fuente: string | null;
              titulo_fuente?: string | null;
              ejemplos_resueltos?: string | null;
              limite_palabras: number;
              checklist: string[];
            }
          }
          respuestaPrevia={
            respuesta as { texto: string; checklist_marcado: boolean[] } | undefined
          }
        />
      )}
      {nombreTipo === "etiquetado_texto" && (
        <EtiquetadoTexto
          actividadId={actividad.id}
          estudianteId={estudiante.id}
          contenido={sanitizarContenidoEtiquetadoTexto(actividad.contenido as ContenidoEtiquetadoTexto)}
          respuestaPrevia={
            respuesta as { elegidas: string[]; resultado?: boolean[] } | undefined
          }
          puntajeAuto={entregaExistente?.puntaje_auto ?? null}
        />
      )}
      {nombreTipo === "ordenar_fragmentos" && (
        <OrdenarFragmentos
          actividadId={actividad.id}
          estudianteId={estudiante.id}
          contenido={sanitizarContenidoOrdenarFragmentos(actividad.contenido as ContenidoOrdenarFragmentos)}
          respuestaPrevia={respuesta as { orden: number[]; resultadoPorPosicion?: boolean[] } | undefined}
          puntajeAuto={entregaExistente?.puntaje_auto ?? null}
        />
      )}
      {nombreTipo === "evaluar_videos" && (
        <EvaluarVideos
          actividadId={actividad.id}
          estudianteId={estudiante.id}
          contenido={sanitizarContenidoEvaluarVideos(actividad.contenido as ContenidoEvaluarVideos)}
          respuestaPrevia={
            respuesta as
              | { marcadas_bien: string[]; marcadas_mal: string[]; resultado?: { bien: boolean[]; mal: boolean[] } }
              | undefined
          }
          puntajeAuto={entregaExistente?.puntaje_auto ?? null}
        />
      )}
      {nombreTipo === "corregir_ortografia" && (
        <CorregirOrtografia
          actividadId={actividad.id}
          estudianteId={estudiante.id}
          contenido={sanitizarContenidoOrtografia(actividad.contenido as ContenidoOrtografia)}
          respuestaPrevia={
            respuesta as
              | {
                  texto_reescrito: string;
                  comparacion?: { correcta: string; escrita: string; correcto: boolean }[];
                  totalPalabras?: number;
                  errores?: number;
                  aprobado?: boolean;
                }
              | undefined
          }
          puntajeAuto={entregaExistente?.puntaje_auto ?? null}
        />
      )}
        </Card>

        <ActividadPostEntrega
          actividadId={actividad.id}
          confianza={prediccionExistente?.confianza ?? null}
          textoReflexionPrevio={reflexionExistente?.texto ?? null}
          siguienteHref={
            siguienteDisponible
              ? `/estudiante/actividad/${siguiente!.id}`
              : siguiente
                ? `/estudiante/actividad/${actividad.id}`
                : `/estudiante/unidad/${actividad.unidad_id}`
          }
          siguienteHrefTrasEntrega={
            siguienteDependenciaListaTrasEntrega ? `/estudiante/actividad/${siguiente!.id}` : null
          }
          textoSiguiente={
            siguienteDisponible
              ? "Siguiente actividad"
              : siguiente
                ? "Revisar esta actividad antes de continuar"
                : "Volver a la unidad"
          }
          textoSiguienteTrasEntrega={siguiente ? "Siguiente actividad" : "Volver a la unidad"}
          placeholderReflexionPersonalizado={
            nombreTipo === "redaccion_checklist" && modoRedaccion === "leer_reflexionar"
              ? "Reflexiona sobre cómo cambió tu seguridad inicial después de comparar los tres textos."
              : undefined
          }
        />
      </>
    </MomentoActividad>
  );

  return (
    <>
      <AvisoSinConexion />
      <main id="contenido-estudiante" className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <PageHeader
        volverHref={`/estudiante/unidad/${actividad.unidad_id}`}
        titulo={actividad.titulo}
        accion={
          hermanas && hermanas.length > 1 && indiceActual >= 0 ? (
            <div className="flex shrink-0 items-center gap-1">
              {actividadAnterior ? (
                <Link
                  href={`/estudiante/actividad/${actividadAnterior.id}`}
                  aria-label="Actividad anterior"
                  className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </Link>
              ) : (
                <span className="flex size-8 items-center justify-center text-slate-300 dark:text-slate-700">
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </span>
              )}
              <span className="text-xs font-medium text-slate-500 dark:text-slate-500">
                {indiceActual + 1} de {hermanas.length}
              </span>
              {siguienteDisponible ? (
                <Link
                  href={`/estudiante/actividad/${siguiente!.id}`}
                  aria-label="Actividad siguiente"
                  className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
              ) : (
                <span
                  title={siguiente ? "Completa o mejora la actividad anterior para continuar" : undefined}
                  aria-label={siguiente ? "Actividad siguiente bloqueada" : "No hay actividad siguiente"}
                  className="flex size-8 items-center justify-center text-slate-300 dark:text-slate-700"
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </span>
              )}
            </div>
          ) : undefined
        }
      />

      {bloqueAeUc}

      {hermanas && indiceActual >= 0 && (
        <section
          aria-labelledby="progreso-actividad"
          className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
            <h2 id="progreso-actividad" className="font-medium">
              Avance en la unidad
            </h2>
            <span>
              Actividad {indiceActual + 1} de {hermanas.length}
              {actividadActualLista ? " · Completada" : entregaExistente ? " · Necesita mejora" : " · Lista para trabajar"}
            </span>
          </div>
          <ProgressBar
            porcentaje={porcentajeUnidad}
            etiqueta={`Actividad ${indiceActual + 1} de ${hermanas.length} de la unidad`}
          />
        </section>
      )}

      <ActividadOrientacion
        tieneVideo={Boolean(actividad.video_url)}
        completada={Boolean(entregaExistente)}
        aprendizajeEsperado={actividad.aprendizaje_esperado}
        ayuda={ayudaActividad}
      />

      <EntregaRecienteProvider
        key={actividad.id}
        inicial={
          entregaExistente
            ? { puntajeAuto: entregaExistente.puntaje_auto, respuesta: respuesta as Record<string, unknown> }
            : null
        }
      >
        {!prediccionExistente && !entregaExistente ? (
          <MomentoActividad
            numero={1}
            titulo="Piensa antes de empezar"
            instruccion={instruccionesMomentos.presentacion}
          >
            <Prediccion actividadId={actividad.id} />
          </MomentoActividad>
        ) : actividad.video_url ? (
          <VideoIntro
            videoUrl={actividad.video_url}
            titulo={actividad.titulo}
            instruccion={instruccionesMomentos.video}
          >
            {contenidoActividad}
          </VideoIntro>
        ) : (
          contenidoActividad
        )}
      </EntregaRecienteProvider>
      </main>
      <ReportarProblema
        tipo="estudiante"
        estudianteId={estudiante.id}
        grupoId={estudiante.grupo_id}
        navegacionInferior={false}
      />
    </>
  );
}
