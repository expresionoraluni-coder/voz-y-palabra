import ActividadForm from "../actividad-form";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { revisarErrorConsulta } from "@/lib/revisar-error-consulta";

export default async function NuevaActividad({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: unidadId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: sesionError,
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous === true) redirect("/ingreso/profesora");
  revisarErrorConsulta(sesionError, "No pudimos validar tu sesión docente.");

  const { data: grupos, error: gruposError } = await supabase
    .from("grupos")
    .select("id, nombre")
    .eq("docente_id", user.id)
    .order("nombre");
  revisarErrorConsulta(gruposError, "No pudimos cargar tus grupos.");

  return <ActividadForm unidadId={unidadId} gruposApertura={grupos ?? []} />;
}
