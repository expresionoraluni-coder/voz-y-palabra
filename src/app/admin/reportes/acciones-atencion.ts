"use server";

import { revalidatePath } from "next/cache";
import { obtenerAdministrador } from "@/lib/supabase/requerir-administrador";

const ESTADOS = new Set(["recibido", "en_revision", "necesita_informacion", "resuelto", "cerrado"]);
const PRIORIDADES = new Set(["baja", "normal", "alta", "urgente"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TRANSICIONES: Record<string, Set<string>> = {
  recibido: new Set(["en_revision", "necesita_informacion", "resuelto", "cerrado"]),
  en_revision: new Set(["necesita_informacion", "resuelto", "cerrado"]),
  necesita_informacion: new Set(["en_revision", "resuelto", "cerrado"]),
  resuelto: new Set(["en_revision", "cerrado"]),
  cerrado: new Set(["en_revision"]),
};

export async function guardarAtencionReporte(input: {
  reporteId: string;
  estado: string;
  prioridad: string;
  respuestaPublica: string;
  resolucion: string;
  asignadoA: string | null;
  fechaLimite: string | null;
  actualizadoEn: string;
}) {
  const acceso = await obtenerAdministrador();
  if (!acceso) return { ok: false, error: "Tu sesión administrativa ya no está activa." };
  if (!UUID.test(input.reporteId) || !ESTADOS.has(input.estado) || !PRIORIDADES.has(input.prioridad)) {
    return { ok: false, error: "Los datos de atención no son válidos." };
  }

  const resolucion = input.resolucion.trim();
  const respuestaPublica = input.respuestaPublica.trim();
  if (resolucion.length > 2000) {
    return { ok: false, error: "La nota de atención es demasiado larga." };
  }
  if (respuestaPublica.length > 2000) {
    return { ok: false, error: "La respuesta pública es demasiado larga." };
  }
  if (input.asignadoA !== null && !UUID.test(input.asignadoA)) {
    return { ok: false, error: "La cuenta asignada no es válida." };
  }
  if (input.fechaLimite !== null && (!input.fechaLimite || Number.isNaN(Date.parse(input.fechaLimite)))) {
    return { ok: false, error: "La fecha límite no es válida." };
  }
  if (!UUID.test(input.reporteId) || !input.actualizadoEn || Number.isNaN(Date.parse(input.actualizadoEn))) {
    return { ok: false, error: "La versión del reporte ya no es válida. Recarga la bandeja." };
  }
  if (["resuelto", "cerrado"].includes(input.estado) && !resolucion) {
    return { ok: false, error: "Escribe una nota antes de marcar el reporte como resuelto o cerrado." };
  }

  const { data: actual, error: consultaError } = await acceso.supabase
    .from("reportes")
    .select("estado, updated_at")
    .eq("id", input.reporteId)
    .maybeSingle();

  if (consultaError) return { ok: false, error: "No pudimos verificar la versión del reporte." };
  if (!actual) return { ok: false, error: "Este reporte ya no está disponible." };
  if (actual.updated_at !== input.actualizadoEn) return { ok: false, error: "Este reporte cambió en otra sesión. Recarga la bandeja antes de guardarlo." };
  if (actual.estado !== input.estado && !TRANSICIONES[actual.estado]?.has(input.estado)) {
    return { ok: false, error: "Ese cambio de estado no es válido. Avanza el caso paso a paso o vuelve a abrirlo." };
  }

  const { data, error } = await acceso.supabase
    .from("reportes")
    .update({
      estado: input.estado,
      prioridad: input.prioridad,
      respuesta_publica: respuestaPublica || null,
      resolucion: resolucion || null,
      asignado_a: input.asignadoA || null,
      fecha_limite: input.fechaLimite || null,
    })
    .eq("id", input.reporteId)
    .eq("updated_at", input.actualizadoEn)
    .select("id, updated_at")
    .maybeSingle();

  if (error) return { ok: false, error: "No pudimos guardar la atención. Intenta de nuevo." };
  if (!data) return { ok: false, error: "Este reporte cambió en otra sesión. Recarga la bandeja antes de guardarlo." };

  revalidatePath("/admin");
  revalidatePath("/admin/reportes");
  return { ok: true, actualizadoEn: data.updated_at };
}

export async function enviarMensajeReporte(reporteId: string, mensaje: string) {
  const acceso = await obtenerAdministrador();
  if (!acceso) return { ok: false, error: "Tu sesión administrativa ya no está activa." };
  if (!UUID.test(reporteId)) return { ok: false, error: "El reporte no es válido." };
  const texto = mensaje.trim();
  if (texto.length < 2 || texto.length > 2000) {
    return { ok: false, error: "El mensaje debe tener entre 2 y 2000 caracteres." };
  }

  const { error } = await acceso.supabase.rpc("registrar_mensaje_reporte", {
    p_reporte_id: reporteId,
    p_mensaje: texto,
  });
  if (error) return { ok: false, error: "No pudimos enviar el mensaje. Intenta de nuevo." };

  revalidatePath("/admin");
  revalidatePath("/admin/reportes");
  return { ok: true };
}
