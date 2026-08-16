"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { esVideoUrlPermitida } from "@/lib/video-embed";
import { esUuid, validarTexto } from "@/lib/validar-entrega";
import { mensajeError } from "@/lib/mensaje-error";

export async function guardarVideoActividad(
  actividadId: string,
  unidadId: string,
  videoUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!esUuid(actividadId) || !esUuid(unidadId)) {
    return { ok: false, error: "La actividad no es válida." };
  }

  const url = videoUrl.trim();
  if (url) {
    const errorTexto = validarTexto(url, { nombre: "El enlace del video", maximo: 500 });
    if (errorTexto) return { ok: false, error: errorTexto };
    if (!esVideoUrlPermitida(url)) {
      return { ok: false, error: "Usa un enlace HTTPS de YouTube, por ejemplo youtube.com/watch o youtu.be." };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Entra de nuevo para continuar." };

  const { error } = await supabase
    .from("actividades")
    .update({ video_url: url || null })
    .eq("id", actividadId)
    .eq("unidad_id", unidadId)
    .select("id")
    .single();

  if (error) return { ok: false, error: mensajeError(error) };

  revalidatePath(`/docente/unidades/${unidadId}`);
  revalidatePath(`/docente/unidades/${unidadId}/actividades/${actividadId}`);
  return { ok: true };
}
