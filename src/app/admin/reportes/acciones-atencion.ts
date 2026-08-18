"use server";

import { revalidatePath } from "next/cache";
import { obtenerAdministrador } from "@/lib/supabase/requerir-administrador";

const ESTADOS = new Set(["recibido", "en_revision", "necesita_informacion", "resuelto", "cerrado"]);
const PRIORIDADES = new Set(["baja", "normal", "alta", "urgente"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function guardarAtencionReporte(input: {
  reporteId: string;
  estado: string;
  prioridad: string;
  resolucion: string;
}) {
  const acceso = await obtenerAdministrador();
  if (!acceso) return { ok: false, mensaje: "Tu sesión administrativa ya no está activa." };
  if (!UUID.test(input.reporteId) || !ESTADOS.has(input.estado) || !PRIORIDADES.has(input.prioridad)) {
    return { ok: false, mensaje: "Los datos de atención no son válidos." };
  }

  const resolucion = input.resolucion.trim();
  if (resolucion.length > 2000) {
    return { ok: false, mensaje: "La nota de atención es demasiado larga." };
  }

  const { error } = await acceso.supabase
    .from("reportes")
    .update({
      estado: input.estado,
      prioridad: input.prioridad,
      resolucion: resolucion || null,
      atendido_por: acceso.administrador.id,
      atendido_en: ["resuelto", "cerrado"].includes(input.estado) ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.reporteId);

  if (error) return { ok: false, mensaje: "No pudimos guardar la atención. Intenta de nuevo." };

  revalidatePath("/admin");
  revalidatePath("/admin/reportes");
  return { ok: true };
}
