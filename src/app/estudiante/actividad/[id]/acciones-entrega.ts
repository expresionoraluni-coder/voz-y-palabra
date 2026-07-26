"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { mensajeError } from "@/lib/mensaje-error";
import { contextoCalificacion, guardarEntregaCalificada, type ResultadoCalificacion } from "./acciones-calificacion";

// Para los tipos sin clave que proteger (revisión 100% humana de la
// docente): no hay nada que calificar aquí, pero igual se guarda con el
// cliente admin — la escritura directa del estudiante sobre `entregas` ya
// no existe vía RLS (ver sub-fase 5), así que este es el único camino.
// `contextoCalificacion` de paso cierra el mismo "endpoint alcanzable
// directo sin pasar por la UI" para estos tipos también.
export async function guardarEntregaAbiertaAccion(
  actividadId: string,
  tipoEsperado: string,
  respuesta: Record<string, unknown>,
  estado: "completada" | "pendiente_revision",
): Promise<ResultadoCalificacion> {
  const ctx = await contextoCalificacion(actividadId, tipoEsperado);
  if (!ctx.ok) return ctx;
  return guardarEntregaCalificada(ctx.supabase, ctx.estudianteId, actividadId, respuesta, null, estado);
}

export async function reiniciarEntregaAccion(
  actividadId: string,
  tipoEsperado: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await contextoCalificacion(actividadId, tipoEsperado);
  if (!ctx.ok) return ctx;

  const admin = createAdminClient();
  const { error } = await admin
    .from("entregas")
    .delete()
    .eq("estudiante_id", ctx.estudianteId)
    .eq("actividad_id", actividadId);
  if (error) return { ok: false, error: mensajeError(error) };

  return { ok: true };
}
