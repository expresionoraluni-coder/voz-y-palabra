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

export async function guardarAperturasActividad(
  actividadId: string,
  unidadId: string,
  fecha: string,
  grupoIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!esUuid(actividadId) || !esUuid(unidadId)) {
    return { ok: false, error: "La actividad no es válida." };
  }
  const fechaParseada = /^\d{4}-\d{2}-\d{2}$/.test(fecha)
    ? new Date(`${fecha}T00:00:00.000Z`)
    : null;
  if (!fechaParseada || Number.isNaN(fechaParseada.getTime()) || fechaParseada.toISOString().slice(0, 10) !== fecha) {
    return { ok: false, error: "Selecciona una fecha de apertura válida." };
  }
  if (!grupoIds.length || grupoIds.some((id) => !esUuid(id)) || new Set(grupoIds).size !== grupoIds.length) {
    return { ok: false, error: "Selecciona al menos un grupo válido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous === true) {
    return { ok: false, error: "Tu sesión expiró. Entra de nuevo para continuar." };
  }

  const { error } = await supabase.rpc("guardar_apertura_actividad_docente", {
    p_actividad_id: actividadId,
    p_fecha: fecha,
    p_grupo_ids: grupoIds,
  });
  if (error) return { ok: false, error: mensajeError(error) };

  revalidatePath(`/docente/unidades/${unidadId}`);
  revalidatePath(`/docente/unidades/${unidadId}/actividades/${actividadId}`);
  revalidatePath(`/docente/grupos`);
  return { ok: true };
}
