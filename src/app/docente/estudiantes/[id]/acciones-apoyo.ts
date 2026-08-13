"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { mensajeError } from "@/lib/mensaje-error";
import { esUuid, validarTexto } from "@/lib/validar-entrega";

type EstadoApoyo = "logrado" | "en_proceso" | "necesita_apoyo";

const ESTADOS_APOYO = new Set<EstadoApoyo>(["logrado", "en_proceso", "necesita_apoyo"]);

export async function guardarOrientacionAccion(
  entregaId: string,
  comentario: string,
  estadoApoyo: EstadoApoyo | null,
  marcarAtendida: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!esUuid(entregaId)) return { ok: false, error: "La entrega no es válida." };
  const errorComentario = validarTexto(comentario, { nombre: "La orientación", maximo: 2_000 });
  if (errorComentario) return { ok: false, error: errorComentario };
  if (estadoApoyo !== null && !ESTADOS_APOYO.has(estadoApoyo)) {
    return { ok: false, error: "La señal de apoyo no es válida." };
  }
  if (!comentario.trim() && !estadoApoyo) {
    return { ok: false, error: "Elige una señal o escribe una orientación." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Entra de nuevo para continuar." };

  const admin = createAdminClient();
  const { data: entrega, error: entregaError } = await admin
    .from("entregas")
    .select("id, estudiante_id, estado")
    .eq("id", entregaId)
    .single();
  if (entregaError || !entrega) return { ok: false, error: "No encontramos esta entrega." };

  const { data: estudiante } = await admin
    .from("estudiantes")
    .select("grupo_id")
    .eq("id", entrega.estudiante_id)
    .single();
  const { data: grupo } = estudiante?.grupo_id
    ? await admin.from("grupos").select("docente_id").eq("id", estudiante.grupo_id).single()
    : { data: null };
  if (grupo?.docente_id !== user.id) {
    return { ok: false, error: "No tienes permiso para acompañar esta entrega." };
  }

  if (comentario.trim()) {
    const { error } = await admin.from("retroalimentacion_docente").insert({
      entrega_id: entregaId,
      docente_id: user.id,
      comentario: comentario.trim(),
    });
    if (error) return { ok: false, error: mensajeError(error) };
  }

  const cambios: Record<string, unknown> = { evaluacion_docente: estadoApoyo };
  if (marcarAtendida && entrega.estado === "pendiente_revision") cambios.estado = "revisada";
  const { error: actualizarError } = await admin.from("entregas").update(cambios).eq("id", entregaId);
  if (actualizarError) return { ok: false, error: mensajeError(actualizarError) };

  return { ok: true };
}
