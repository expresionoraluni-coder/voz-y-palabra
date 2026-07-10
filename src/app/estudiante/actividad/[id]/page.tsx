import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OpcionJustificacion from "./opcion-justificacion";
import Clasificacion from "./clasificacion";
import EncontrarCorregir from "./encontrar-corregir";
import Comparador from "./comparador";

const TIPOS_CONSTRUIDOS = [
  "opcion_justificacion",
  "clasificacion",
  "encontrar_corregir",
  "comparador",
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

  const { data: estudiante } = await supabase
    .from("estudiantes")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();
  if (!estudiante) redirect("/ingreso/estudiante");

  const { data: actividad } = await supabase
    .from("actividades")
    .select("id, unidad_id, titulo, instrucciones, contenido, tipos_actividad(nombre)")
    .eq("id", id)
    .single();
  if (!actividad) notFound();

  const tipo = Array.isArray(actividad.tipos_actividad)
    ? actividad.tipos_actividad[0]
    : actividad.tipos_actividad;
  const nombreTipo = tipo?.nombre;

  const { data: entregaExistente } = await supabase
    .from("entregas")
    .select("respuesta")
    .eq("actividad_id", id)
    .eq("estudiante_id", estudiante.id)
    .maybeSingle();

  const respuesta = entregaExistente?.respuesta;

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 bg-white px-6 py-10 dark:bg-black">
      <div>
        <Link
          href={`/estudiante/unidad/${actividad.unidad_id}`}
          className="text-sm text-zinc-500 underline dark:text-zinc-400"
        >
          ← Volver
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {actividad.titulo}
        </h1>
        {actividad.instrucciones && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {actividad.instrucciones}
          </p>
        )}
      </div>

      {nombreTipo === "opcion_justificacion" && (
        <OpcionJustificacion
          actividadId={actividad.id}
          estudianteId={estudiante.id}
          contenido={actividad.contenido as { pregunta: string; opciones: string[] }}
          respuestaPrevia={respuesta as { opcion: string; justificacion: string } | undefined}
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
          contenido={actividad.contenido as { texto_original: string; pista: string | null }}
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
      {!TIPOS_CONSTRUIDOS.includes(nombreTipo ?? "") && (
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          Este tipo de actividad estará disponible en una fase próxima.
        </p>
      )}
    </div>
  );
}
