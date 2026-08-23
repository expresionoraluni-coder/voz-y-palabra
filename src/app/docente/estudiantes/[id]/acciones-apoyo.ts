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
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) return { ok: false, error: "No pudimos validar tu sesión. Intenta de nuevo." };
  if (!user) return { ok: false, error: "Tu sesión expiró. Entra de nuevo para continuar." };

  const admin = createAdminClient();
  const { data: entrega, error: entregaError } = await admin
    .from("entregas")
    .select("id, estudiante_id, estado")
    .eq("id", entregaId)
    .single();
  if (entregaError) {
    return {
      ok: false,
      error: entregaError.code === "PGRST116" ? "No encontramos esta entrega." : "No pudimos cargar esta entrega. Intenta de nuevo.",
    };
  }
  if (!entrega) return { ok: false, error: "No encontramos esta entrega." };

  const { data: estudiante, error: estudianteError } = await admin
    .from("estudiantes")
    .select("grupo_id")
    .eq("id", entrega.estudiante_id)
    .single();
  if (estudianteError || !estudiante?.grupo_id) return { ok: false, error: "No pudimos comprobar el grupo de esta entrega." };

  const { data: grupo, error: grupoError } = await admin
    .from("grupos")
    .select("docente_id")
    .eq("id", estudiante.grupo_id)
    .single();
  if (grupoError) return { ok: false, error: "No pudimos comprobar el permiso sobre esta entrega." };
  if (grupo?.docente_id !== user.id) {
    return { ok: false, error: "No tienes permiso para acompañar esta entrega." };
  }

  const { error: actualizarError } = await supabase.rpc("registrar_orientacion_docente", {
    p_entrega_id: entregaId,
    p_comentario: comentario.trim(),
    p_estado_apoyo: estadoApoyo,
    p_marcar_atendida: marcarAtendida,
  });
  if (actualizarError) return { ok: false, error: mensajeError(actualizarError) };

  return { ok: true };
}
