import ActividadForm from "../actividad-form";

export default async function NuevaActividad({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: unidadId } = await params;
  return <ActividadForm unidadId={unidadId} />;
}
