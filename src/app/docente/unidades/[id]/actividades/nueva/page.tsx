"use client";

import { use } from "react";
import ActividadForm from "../actividad-form";

export default function NuevaActividad({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: unidadId } = use(params);
  return <ActividadForm unidadId={unidadId} />;
}
