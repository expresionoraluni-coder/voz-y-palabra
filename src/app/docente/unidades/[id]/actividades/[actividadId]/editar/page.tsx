import { redirect } from "next/navigation";

export default async function EditarActividad({
  params,
}: {
  params: Promise<{ id: string; actividadId: string }>;
}) {
  const { id: unidadId } = await params;
  redirect(`/docente/unidades/${unidadId}`);
}
