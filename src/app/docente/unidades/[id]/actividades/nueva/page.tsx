import { redirect } from "next/navigation";

export default async function NuevaActividad({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: unidadId } = await params;
  redirect(`/docente/unidades/${unidadId}`);
}
