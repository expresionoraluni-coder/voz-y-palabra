"use server";

import { guardarEntregaInterna, obtenerContextoCalificacion, reiniciarEntregaInterna } from "@/lib/estudiante-entregas-server";
import { esRegistroPlano, esUuid, validarEstadoEntrega, validarJsonDeEntrega } from "@/lib/validar-entrega";
import { validarRespuestaComprension } from "@/lib/validar-respuesta-comprension";
import { contarPalabras } from "@/lib/contar-palabras";
import { esModoChips } from "@/lib/calificacion-comparador";
import type { ResultadoCalificacion } from "@/lib/estudiante-entregas-server";

export type { ResultadoCalificacion } from "@/lib/estudiante-entregas-server";

const TIPOS_ENTREGA_ABIERTA = new Set([
  "comparador",
  "redaccion_checklist",
]);

function validarEntregaAbiertaPorTipo(
  tipoEsperado: string,
  contenido: Record<string, unknown>,
  respuesta: Record<string, unknown>,
  estado: "completada" | "pendiente_revision",
): string | null {
  if (tipoEsperado === "comparador") {
    if (esModoChips(contenido as { banco_respuestas?: string[] })) {
      return "Esta actividad usa respuestas automáticas; recarga la página e inténtalo de nuevo.";
    }
    if (estado !== "pendiente_revision") return "El estado de esta entrega no es válido.";
    const celdas = respuesta.celdas;
    if (
      !Array.isArray(celdas) ||
      !celdas.every(
        (fila) =>
          Array.isArray(fila) &&
          fila.length <= 20 &&
          fila.every((celda) => typeof celda === "string" && celda.length <= 500),
      )
    ) {
      return "La respuesta del comparador no es válida.";
    }
  }

  if (tipoEsperado !== "redaccion_checklist") return null;

  const modo = typeof contenido.modo === "string" ? contenido.modo : null;
  if (modo === "leer_reflexionar") {
    return estado === "completada" ? null : "El estado de esta entrega no es válido.";
  }

  if (estado !== "pendiente_revision") return "El estado de esta entrega no es válido.";
  const texto = respuesta.texto;
  const limite = contenido.limite_palabras;
  const checklist = contenido.checklist;
  const checklistMarcado = respuesta.checklist_marcado;
  if (
    typeof texto !== "string" ||
    typeof limite !== "number" ||
    !Number.isInteger(limite) ||
    limite < 15 ||
    !Array.isArray(checklist) ||
    !checklist.every((punto) => typeof punto === "string") ||
    !Array.isArray(checklistMarcado) ||
    checklistMarcado.length !== checklist.length ||
    !checklistMarcado.every((marcado) => typeof marcado === "boolean")
  ) {
    return "La respuesta de la redacción no es válida.";
  }

  const palabras = contarPalabras(texto);
  const minimoPalabras = Math.max(15, Math.round(limite * 0.5));
  if (palabras < minimoPalabras) return `Escribe al menos ${minimoPalabras} palabras antes de entregar.`;
  if (palabras > limite) return `Tu texto debe tener ${limite} palabras o menos.`;
  return null;
}

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
  const errorTipo = validarEntregaAbiertaPorTipo(tipoEsperado, ctx.contexto.contenido, respuesta, estado);
  if (errorTipo) return { ok: false, error: errorTipo };

  const respuestaParaGuardar = { ...respuesta };
  if (tipoEsperado === "redaccion_checklist") delete respuestaParaGuardar.analisisTexto;
  return guardarEntregaInterna(
    ctx.contexto.supabase,
    actividadId,
    respuestaParaGuardar,
    null,
    estado,
    ctx.contexto.estudianteId,
  );
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
  return reiniciarEntregaInterna(ctx.contexto.supabase, actividadId, ctx.contexto.estudianteId);
}
