import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ActividadForm from "../../actividad-form";

export default async function EditarActividad({
  params,
}: {
  params: Promise<{ id: string; actividadId: string }>;
}) {
  const { id: unidadId, actividadId } = await params;
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    { data: actividad },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("actividades")
      .select("id, titulo, instrucciones, contenido, aprendizaje_esperado, video_url, tipos_actividad(nombre)")
      .eq("id", actividadId)
      .single(),
  ]);

  if (!user) redirect("/ingreso/profesora");
  if (!actividad) notFound();

  const tipo = Array.isArray(actividad.tipos_actividad) ? actividad.tipos_actividad[0] : actividad.tipos_actividad;

  return (
    <ActividadForm
      unidadId={unidadId}
      actividadInicial={{
        id: actividad.id,
        tipoNombre: tipo?.nombre ?? "",
        titulo: actividad.titulo,
        instrucciones: actividad.instrucciones ?? "",
        aprendizajeEsperado: actividad.aprendizaje_esperado ?? "",
        videoUrl: actividad.video_url ?? "",
        contenido: (actividad.contenido as Record<string, unknown>) ?? {},
      }}
    />
  );
}
