import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import UnidadCompetenciaTag from "@/components/ui/unidad-competencia-tag";
import type { ContenidoOpcionJustificacion } from "@/lib/opcion-justificacion";
import { EntregaRecienteProvider } from "@/lib/entrega-reciente-context";
import VideoIntro from "./video-intro";
import OpcionJustificacion from "./opcion-justificacion";
import Clasificacion from "./clasificacion";
import EncontrarCorregir from "./encontrar-corregir";
import Comparador from "./comparador";
import RedaccionChecklist from "./redaccion-checklist";
import RedaccionLectura from "./redaccion-lectura";
import EtiquetadoTexto from "./etiquetado-texto";
import ConstructorRamificado from "./constructor-ramificado";
import ActividadPostEntrega from "./actividad-post-entrega";
import Prediccion from "./prediccion";
import GrabacionRubrica from "./grabacion-rubrica";
import OrdenarFragmentos from "./ordenar-fragmentos";
import EvaluarVideos from "./evaluar-videos";
import CorregirOrtografia from "./corregir-ortografia";

const TIPOS_CONSTRUIDOS = [
  "opcion_justificacion",
  "clasificacion",
  "encontrar_corregir",
  "comparador",
  "redaccion_checklist",
  "etiquetado_texto",
  "constructor_ramificado",
  "grabacion_rubrica",
  "ordenar_fragmentos",
  "evaluar_videos",
  "corregir_ortografia",
];

export default async function ActividadEstudiante({
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

  const [{ data: estudiante }, { data: actividad }] = await Promise.all([
    supabase.from("estudiantes").select("id").eq("auth_user_id", user.id).single(),
    supabase
      .from("actividades")
      .select(
        "id, unidad_id, orden, titulo, instrucciones, contenido, aprendizaje_esperado, video_url, requiere_actividad_id, tipos_actividad(nombre), unidades(unidad_competencia)",
      )
      .eq("id", id)
      .single(),
  ]);
  if (!estudiante) redirect("/ingreso/estudiante");
  if (!actividad) notFound();

  if (actividad.requiere_actividad_id) {
    const { data: entregaPrerequisito } = await supabase
      .from("entregas")
      .select("puntaje_auto")
      .eq("actividad_id", actividad.requiere_actividad_id)
      .eq("estudiante_id", estudiante.id)
      .maybeSingle();
    if (!entregaPrerequisito || (entregaPrerequisito.puntaje_auto ?? 0) < 70) {
      redirect(`/estudiante/unidad/${actividad.unidad_id}`);
    }
  }

  const tipo = Array.isArray(actividad.tipos_actividad)
    ? actividad.tipos_actividad[0]
    : actividad.tipos_actividad;
  const nombreTipo = tipo?.nombre;
  const unidadDeActividad = Array.isArray(actividad.unidades) ? actividad.unidades[0] : actividad.unidades;
  const modoRedaccion = (actividad.contenido as { modo?: string } | null)?.modo;

  const [
    { data: entregaExistente },
    { data: prediccionExistente },
    { data: reflexionExistente },
    { data: hermanas },
    { data: unidades },
    { data: confianzaInicioUnidad },
    { data: bitacoraUnidad },
    { data: reflexionCierreUnidad },
  ] = await Promise.all([
    supabase
      .from("entregas")
      .select("respuesta, puntaje_auto")
      .eq("actividad_id", id)
      .eq("estudiante_id", estudiante.id)
      .maybeSingle(),
    supabase
      .from("reflexiones")
      .select("confianza")
      .eq("actividad_id", id)
      .eq("estudiante_id", estudiante.id)
      .eq("momento", "prediccion")
      .maybeSingle(),
    supabase
      .from("reflexiones")
      .select("texto")
      .eq("actividad_id", id)
      .eq("estudiante_id", estudiante.id)
      .eq("momento", "cierre")
      .maybeSingle(),
    supabase
      .from("actividades")
      .select("id, orden, requiere_actividad_id, entregas(puntaje_auto)")
      .eq("unidad_id", actividad.unidad_id)
      .order("orden"),
    // Traídos siempre (son consultas ligeras) para poder armar, sin una
    // segunda vuelta al servidor, la celebración de "unidad completada" si
    // esta entrega resultó ser la que faltaba.
    supabase.from("unidades").select("id, nombre, orden").order("orden"),
    supabase
      .from("autoevaluaciones_confianza")
      .select("valor")
      .eq("estudiante_id", estudiante.id)
      .eq("unidad_id", actividad.unidad_id)
      .eq("momento", "inicio")
      .maybeSingle(),
    supabase
      .from("bitacora")
      .select("meta")
      .eq("estudiante_id", estudiante.id)
      .eq("unidad_id", actividad.unidad_id)
      .maybeSingle(),
    supabase
      .from("reflexiones")
      .select("texto")
      .eq("estudiante_id", estudiante.id)
      .eq("unidad_id", actividad.unidad_id)
      .eq("momento", "cierre")
      .maybeSingle(),
  ]);

  const respuesta = entregaExistente?.respuesta;
  const siguiente = hermanas?.find((a) => a.orden > actividad.orden);
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

  // Si esta entrega fue justo la que le faltaba a la unidad, se abre la
  // celebración con la reflexión de cierre aquí mismo — la usuaria pidió
  // que no dependiera de que el estudiante navegue de vuelta a la unidad
  // por su cuenta para encontrarla.
  const unidadRecienCompletada =
    !!entregaExistente && !!hermanas && hermanas.every((h) => Array.isArray(h.entregas) && h.entregas.length > 0);
  let unidadCompletadaProps = null;
  if (unidadRecienCompletada) {
    const unidadActual = unidades?.find((u) => u.id === actividad.unidad_id);
    const unidadSiguiente = unidadActual ? unidades?.find((u) => u.orden === unidadActual.orden + 1) : undefined;
    const puntajesAuto = (hermanas ?? [])
      .flatMap((h) => (Array.isArray(h.entregas) ? h.entregas : []))
      .map((e) => e.puntaje_auto)
      .filter((p): p is number => p != null);
    const promedioUnidad =
      puntajesAuto.length > 0
        ? Math.round(puntajesAuto.reduce((suma, p) => suma + p, 0) / puntajesAuto.length)
        : null;
    unidadCompletadaProps = {
      unidadId: actividad.unidad_id,
      mensajeCelebracion: unidadActual
        ? `¡Completaste la Unidad ${unidadActual.orden}: ${unidadActual.nombre}!`
        : "¡Completaste la unidad!",
      metaPrevia: bitacoraUnidad?.meta ?? null,
      textoReflexionCierrePrevio: reflexionCierreUnidad?.texto ?? null,
      confianzaInicioPct: confianzaInicioUnidad?.valor ?? null,
      promedioUnidad,
      siguienteHref: unidadSiguiente ? `/estudiante/unidad/${unidadSiguiente.id}` : "/estudiante/inicio",
      textoSiguiente: unidadSiguiente
        ? `Continuar a Unidad ${unidadSiguiente.orden}: ${unidadSiguiente.nombre}`
        : "Volver al inicio",
    };
  }

  const contenidoActividad = (
    <>
      {(actividad.aprendizaje_esperado || unidadDeActividad?.unidad_competencia) && (
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/60">
          {unidadDeActividad?.unidad_competencia && (
            <UnidadCompetenciaTag texto={unidadDeActividad.unidad_competencia} compacto />
          )}
          {actividad.aprendizaje_esperado && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
                Aprendizaje esperado (lo que esta actividad busca que logres)
              </p>
              <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">
                {actividad.aprendizaje_esperado}
              </p>
            </div>
          )}
        </div>
      )}

      <EntregaRecienteProvider
        inicial={
          entregaExistente
            ? { puntajeAuto: entregaExistente.puntaje_auto, respuesta: entregaExistente.respuesta as Record<string, unknown> }
            : null
        }
      >
      {!prediccionExistente && !entregaExistente ? (
        <Prediccion actividadId={actividad.id} estudianteId={estudiante.id} />
      ) : (
      <Card className="p-5 sm:p-6">
      {nombreTipo === "opcion_justificacion" && (
        <OpcionJustificacion
          actividadId={actividad.id}
          estudianteId={estudiante.id}
          contenido={actividad.contenido as ContenidoOpcionJustificacion}
          respuestaPrevia={respuesta as Record<string, unknown> | undefined}
        />
      )}
      {nombreTipo === "clasificacion" && (
        <Clasificacion
          actividadId={actividad.id}
          estudianteId={estudiante.id}
          contenido={
            actividad.contenido as {
              categorias: string[];
              elementos: { texto: string; categoria_correcta: string }[];
              contexto?: string | null;
            }
          }
          respuestaPrevia={respuesta as { elegidas: string[] } | undefined}
          dosNiveles={esDosNiveles}
        />
      )}
      {nombreTipo === "encontrar_corregir" && (
        <EncontrarCorregir
          actividadId={actividad.id}
          estudianteId={estudiante.id}
          contenido={
            actividad.contenido as {
              texto_original: string;
              pista: string | null;
              fragmento_erroneo?: string;
              ideas_clave?: string[];
            }
          }
          respuestaPrevia={
            respuesta as { que_encontraste: string; version_corregida: string } | undefined
          }
        />
      )}
      {nombreTipo === "comparador" && (
        <Comparador
          actividadId={actividad.id}
          estudianteId={estudiante.id}
          contenido={
            actividad.contenido as {
              conceptos: string[];
              criterios: string[];
              banco_respuestas?: string[];
              celda_correcta?: string[][];
            }
          }
          respuestaPrevia={respuesta as { celdas: string[][] } | undefined}
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
          contenido={
            actividad.contenido as {
              contexto: string | null;
              etiquetas: string[];
              fragmentos: { texto: string; etiqueta_correcta: string; opciones?: string[] }[];
              en_linea?: boolean;
            }
          }
          respuestaPrevia={respuesta as { elegidas: string[] } | undefined}
        />
      )}
      {nombreTipo === "constructor_ramificado" && (
        <ConstructorRamificado
          actividadId={actividad.id}
          estudianteId={estudiante.id}
          contenido={
            actividad.contenido as {
              tema_sugerido: string | null;
              secciones: { nombre: string; guia: string }[];
            }
          }
          respuestaPrevia={respuesta as { tema: string; textos: string[] } | undefined}
        />
      )}
      {nombreTipo === "ordenar_fragmentos" && (
        <OrdenarFragmentos
          actividadId={actividad.id}
          estudianteId={estudiante.id}
          contenido={
            actividad.contenido as {
              contexto?: string | null;
              fragmentos: string[];
              orden_correcto: number[];
            }
          }
          respuestaPrevia={respuesta as { orden: number[] } | undefined}
        />
      )}
      {nombreTipo === "evaluar_videos" && (
        <EvaluarVideos
          actividadId={actividad.id}
          estudianteId={estudiante.id}
          contenido={
            actividad.contenido as {
              intro?: string | null;
              cualidades: string[];
              video_bien: { url: string | null; presentes: string[] };
              video_mal: { url: string | null; ausentes: string[] };
            }
          }
          respuestaPrevia={respuesta as { marcadas_bien: string[]; marcadas_mal: string[] } | undefined}
        />
      )}
      {nombreTipo === "corregir_ortografia" && (
        <CorregirOrtografia
          actividadId={actividad.id}
          estudianteId={estudiante.id}
          contenido={
            actividad.contenido as {
              contexto?: string | null;
              texto_incorrecto: string;
              texto_correcto: string;
              temas?: string[];
            }
          }
          respuestaPrevia={respuesta as { texto_reescrito: string } | undefined}
        />
      )}
      {nombreTipo === "grabacion_rubrica" && (
        <GrabacionRubrica
          actividadId={actividad.id}
          estudianteId={estudiante.id}
          contenido={
            actividad.contenido as {
              tema_sugerido: string;
              duracion_sugerida_segundos: number;
              rubrica: string[];
            }
          }
          respuestaPrevia={
            respuesta as { autoevaluacion: Record<string, boolean>; reflexion: string } | undefined
          }
        />
      )}
      {!TIPOS_CONSTRUIDOS.includes(nombreTipo ?? "") && (
        <p className="text-sm text-slate-500 dark:text-slate-500">
          Este tipo de actividad estará disponible en una fase próxima.
        </p>
      )}
      </Card>
      )}

      <ActividadPostEntrega
        actividadId={actividad.id}
        estudianteId={estudiante.id}
        confianza={prediccionExistente?.confianza ?? null}
        textoReflexionPrevio={reflexionExistente?.texto ?? null}
        siguienteHref={siguiente ? `/estudiante/actividad/${siguiente.id}` : `/estudiante/unidad/${actividad.unidad_id}`}
        textoSiguiente={siguiente ? "Siguiente actividad" : "Volver a la unidad"}
        placeholderReflexionPersonalizado={
          nombreTipo === "redaccion_checklist" && modoRedaccion === "leer_reflexionar"
            ? "¿Qué cambia entre el resumen y la síntesis? ¿Y entre la síntesis y la paráfrasis?"
            : undefined
        }
        unidadCompletada={unidadCompletadaProps}
      />
      </EntregaRecienteProvider>
    </>
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <PageHeader
        volverHref={`/estudiante/unidad/${actividad.unidad_id}`}
        titulo={actividad.titulo}
        descripcion={actividad.instrucciones}
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
              {siguiente ? (
                <Link
                  href={`/estudiante/actividad/${siguiente.id}`}
                  aria-label="Actividad siguiente"
                  className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
              ) : (
                <span className="flex size-8 items-center justify-center text-slate-300 dark:text-slate-700">
                  <ChevronRight className="size-4" aria-hidden="true" />
                </span>
              )}
            </div>
          ) : undefined
        }
      />

      {!entregaExistente ? (
        <VideoIntro videoUrl={actividad.video_url} titulo={actividad.titulo}>
          {contenidoActividad}
        </VideoIntro>
      ) : (
        contenidoActividad
      )}
    </div>
  );
}
