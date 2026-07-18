import { redirect, notFound } from "next/navigation";
import { Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import type { ContenidoOpcionJustificacion } from "@/lib/opcion-justificacion";
import OpcionJustificacion from "./opcion-justificacion";
import Clasificacion from "./clasificacion";
import EncontrarCorregir from "./encontrar-corregir";
import Comparador from "./comparador";
import RedaccionChecklist from "./redaccion-checklist";
import EtiquetadoTexto from "./etiquetado-texto";
import ConstructorRamificado from "./constructor-ramificado";
import Reflexion from "./reflexion";
import Prediccion from "./prediccion";
import GrabacionRubrica from "./grabacion-rubrica";

const TIPOS_CONSTRUIDOS = [
  "opcion_justificacion",
  "clasificacion",
  "encontrar_corregir",
  "comparador",
  "redaccion_checklist",
  "etiquetado_texto",
  "constructor_ramificado",
  "grabacion_rubrica",
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
        "id, unidad_id, titulo, instrucciones, contenido, aprendizaje_esperado, tipos_actividad(nombre), unidades(unidad_competencia)",
      )
      .eq("id", id)
      .single(),
  ]);
  if (!estudiante) redirect("/ingreso/estudiante");
  if (!actividad) notFound();

  const tipo = Array.isArray(actividad.tipos_actividad)
    ? actividad.tipos_actividad[0]
    : actividad.tipos_actividad;
  const nombreTipo = tipo?.nombre;
  const unidadDeActividad = Array.isArray(actividad.unidades) ? actividad.unidades[0] : actividad.unidades;

  const [{ data: entregaExistente }, { data: prediccionExistente }, { data: reflexionExistente }] =
    await Promise.all([
      supabase
        .from("entregas")
        .select("respuesta, puntaje_auto")
        .eq("actividad_id", id)
        .eq("estudiante_id", estudiante.id)
        .maybeSingle(),
      supabase
        .from("reflexiones")
        .select("texto, confianza")
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
    ]);

  const respuesta = entregaExistente?.respuesta;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-6 px-6 py-10">
      <PageHeader
        volverHref={`/estudiante/unidad/${actividad.unidad_id}`}
        titulo={actividad.titulo}
        descripcion={actividad.instrucciones}
      />

      {(actividad.aprendizaje_esperado || unidadDeActividad?.unidad_competencia) && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/60">
          {unidadDeActividad?.unidad_competencia && (
            <p className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-500">
              <Target className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {unidadDeActividad.unidad_competencia}
            </p>
          )}
          {actividad.aprendizaje_esperado && (
            <p className="text-sm text-slate-700 dark:text-slate-300">
              <span className="font-medium text-slate-900 dark:text-slate-50">Aprendizaje esperado: </span>
              {actividad.aprendizaje_esperado}
            </p>
          )}
        </div>
      )}

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
            }
          }
          respuestaPrevia={respuesta as { elegidas: string[] } | undefined}
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
          contenido={actividad.contenido as { conceptos: string[]; criterios: string[] }}
          respuestaPrevia={respuesta as { celdas: string[][] } | undefined}
        />
      )}
      {nombreTipo === "redaccion_checklist" && (
        <RedaccionChecklist
          actividadId={actividad.id}
          estudianteId={estudiante.id}
          contenido={
            actividad.contenido as {
              texto_fuente: string | null;
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
              fragmentos: { texto: string; etiqueta_correcta: string }[];
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

      {entregaExistente && (
        <Reflexion
          actividadId={actividad.id}
          estudianteId={estudiante.id}
          textoPrevio={reflexionExistente?.texto}
          prediccionTexto={prediccionExistente?.texto}
          confianzaPrevia={prediccionExistente?.confianza ?? null}
          puntajeAuto={entregaExistente?.puntaje_auto ?? null}
        />
      )}
    </div>
  );
}
