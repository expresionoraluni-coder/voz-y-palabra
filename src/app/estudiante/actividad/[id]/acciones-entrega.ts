"use server";

import { guardarEntregaInterna, obtenerContextoCalificacion, reiniciarEntregaInterna } from "@/lib/estudiante-entregas-server";
import { esRegistroPlano, esUuid, validarEstadoEntrega, validarJsonDeEntrega } from "@/lib/validar-entrega";
import { validarRespuestaComprension } from "@/lib/validar-respuesta-comprension";
import type { ResultadoCalificacion } from "@/lib/estudiante-entregas-server";

export type { ResultadoCalificacion } from "@/lib/estudiante-entregas-server";

const TIPOS_ENTREGA_ABIERTA = new Set([
  "comparador",
  "constructor_ramificado",
  "encontrar_corregir",
  "grabacion_rubrica",
  "redaccion_checklist",
]);

export async function guardarEntregaAbiertaAccion(
  actividadId: string,
  tipoEsperado: string,
  respuesta: Record<string, unknown>,
  estado: "completada" | "pendiente_revision",
): Promise<ResultadoCalificacion> {
  if (!esUuid(actividadId) || !TIPOS_ENTREGA_ABIERTA.has(tipoEsperado)) {
    return { ok: false, error: "La actividad no es válida." };
  }
  if (!esRegistroPlano(respuesta)) return { ok: false, error: "La respuesta no es válida." };
  const respuestaError = validarJsonDeEntrega(respuesta);
  if (respuestaError || !validarEstadoEntrega(estado)) {
    return { ok: false, error: respuestaError ?? "El estado de la entrega no es válido." };
  }

  const ctx = await obtenerContextoCalificacion(actividadId, tipoEsperado);
  if (!ctx.ok) return ctx;
  const modo = (ctx.contexto.contenido as { modo?: string }).modo;
  if (tipoEsperado === "redaccion_checklist" && modo === "leer_reflexionar") {
    const respuestaComprension = respuesta.respuesta_comprension;
    if (typeof respuestaComprension !== "string") {
      return { ok: false, error: "Responde la pregunta de comprensión antes de continuar." };
    }
    const errorComprension = validarRespuestaComprension(respuestaComprension);
    if (errorComprension) return { ok: false, error: errorComprension };
  }
  return guardarEntregaInterna(ctx.contexto.supabase, actividadId, respuesta, null, estado);
}
export async function reiniciarEntregaAccion(
  actividadId: string,
  tipoEsperado: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!esUuid(actividadId) || !TIPOS_ENTREGA_ABIERTA.has(tipoEsperado) && !["clasificacion", "opcion_justificacion"].includes(tipoEsperado)) {
    return { ok: false, error: "La actividad no es válida." };
  }
  const ctx = await obtenerContextoCalificacion(actividadId, tipoEsperado);
  if (!ctx.ok) return ctx;
  return reiniciarEntregaInterna(ctx.contexto.supabase, actividadId);
}
