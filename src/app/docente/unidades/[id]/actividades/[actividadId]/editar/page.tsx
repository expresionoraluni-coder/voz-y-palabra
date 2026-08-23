import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ActividadForm from "../../actividad-form";
import { revisarErrorConsulta } from "@/lib/revisar-error-consulta";

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
      error: sesionError,
    },
    { data: actividad, error: actividadError },
    { count: entregasCount, error: entregasError },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("actividades")
      .select("id, unidad_id, titulo, instrucciones, contenido, aprendizaje_esperado, video_url, tipos_actividad(nombre)")
      .eq("id", actividadId)
      .eq("unidad_id", unidadId)
      .maybeSingle(),
    supabase
      .from("entregas")
      .select("id", { count: "exact", head: true })
      .eq("actividad_id", actividadId),
  ]);

  revisarErrorConsulta(sesionError, "No pudimos validar tu sesión docente.");
  revisarErrorConsulta(actividadError, "No pudimos cargar esta actividad.");
  revisarErrorConsulta(entregasError, "No pudimos comprobar si esta actividad ya tiene entregas.");

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
      tieneEntregas={(entregasCount ?? 0) > 0}
    />
  );
}
