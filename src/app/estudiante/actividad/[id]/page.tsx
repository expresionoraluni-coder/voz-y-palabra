import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OpcionJustificacion from "./opcion-justificacion";
import Clasificacion from "./clasificacion";

type ContenidoOpcionJustificacion = {
  pregunta: string;
  opciones: string[];
};

type ContenidoClasificacion = {
  categorias: string[];
  elementos: { texto: string; categoria_correcta: string }[];
};

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

  const { data: entregaExistente } = await supabase
    .from("entregas")
    .select("respuesta")
    .eq("actividad_id", id)
    .eq("estudiante_id", estudiante.id)
    .maybeSingle();

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

      {tipo?.nombre === "opcion_justificacion" && (
        <OpcionJustificacion
          actividadId={actividad.id}
          estudianteId={estudiante.id}
          contenido={actividad.contenido as ContenidoOpcionJustificacion}
          respuestaPrevia={
            entregaExistente?.respuesta as
              | { opcion: string; justificacion: string }
              | undefined
          }
        />
      )}
      {tipo?.nombre === "clasificacion" && (
        <Clasificacion
          actividadId={actividad.id}
          estudianteId={estudiante.id}
          contenido={actividad.contenido as ContenidoClasificacion}
          respuestaPrevia={
            entregaExistente?.respuesta as { elegidas: string[] } | undefined
          }
        />
      )}
      {tipo?.nombre !== "opcion_justificacion" && tipo?.nombre !== "clasificacion" && (
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          Este tipo de actividad estará disponible en una fase próxima.
        </p>
      )}
    </div>
  );
}
