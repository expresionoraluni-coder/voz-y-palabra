"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { esUuid } from "@/lib/validar-entrega";
import { mensajeError } from "@/lib/mensaje-error";

export async function borrarReflexionCierreUnidad(
  grupoId: string,
  estudianteId: string,
  unidadId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (![grupoId, estudianteId, unidadId].every(esUuid)) {
    return { ok: false, error: "Los datos de la reflexión no son válidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous === true) {
    return { ok: false, error: "Tu sesión docente ya no es válida. Entra de nuevo." };
  }

  const admin = createAdminClient();
  const { data: grupo, error: grupoError } = await admin
    .from("grupos")
    .select("id")
    .eq("id", grupoId)
    .eq("docente_id", user.id)
    .maybeSingle();
  if (grupoError) return { ok: false, error: mensajeError(grupoError) };
  if (!grupo) return { ok: false, error: "No tienes permiso sobre este grupo." };

  const { data: estudiante, error: estudianteError } = await admin
    .from("estudiantes")
    .select("id")
    .eq("id", estudianteId)
    .eq("grupo_id", grupoId)
    .maybeSingle();
  if (estudianteError) return { ok: false, error: mensajeError(estudianteError) };
  if (!estudiante) return { ok: false, error: "Este estudiante no pertenece al grupo." };

  const { data: unidad, error: unidadError } = await admin
    .from("unidades")
    .select("id")
    .eq("id", unidadId)
    .maybeSingle();
  if (unidadError) return { ok: false, error: mensajeError(unidadError) };
  if (!unidad) return { ok: false, error: "No encontramos esta unidad." };

  const { data: reflexion, error: reflexionError } = await admin
    .from("reflexiones")
    .select("id")
    .eq("estudiante_id", estudianteId)
    .eq("unidad_id", unidadId)
    .is("actividad_id", null)
    .eq("momento", "cierre")
    .maybeSingle();
  if (reflexionError) return { ok: false, error: mensajeError(reflexionError) };
  if (!reflexion) return { ok: false, error: "La reflexión de cierre ya no está disponible." };

  const { data: borradas, error: borrarError } = await admin
    .from("reflexiones")
    .delete()
    .eq("id", reflexion.id)
    .eq("estudiante_id", estudianteId)
    .eq("unidad_id", unidadId)
    .is("actividad_id", null)
    .eq("momento", "cierre")
    .select("id");
  if (borrarError) return { ok: false, error: mensajeError(borrarError) };
  if (borradas?.length !== 1) return { ok: false, error: "La reflexión de cierre ya no está disponible." };

  revalidatePath(`/docente/grupos/${grupoId}`);
  revalidatePath("/estudiante/inicio");
  revalidatePath(`/estudiante/unidad/${unidadId}`);
  revalidatePath(`/estudiante/unidad/${unidadId}/cierre`);
  return { ok: true };
}
