"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { esUuid } from "@/lib/validar-entrega";
import { mensajeError } from "@/lib/mensaje-error";

type AccionEstudiantes = "dar_de_baja" | "reactivar";

const ACCIONES_VALIDAS = new Set<AccionEstudiantes>(["dar_de_baja", "reactivar"]);
const MAX_ESTUDIANTES_POR_LOTE = 100;

export async function actualizarEstudiantesLote(
  grupoId: string,
  estudianteIds: string[],
  accion: AccionEstudiantes,
): Promise<{ ok: true; actualizados: number } | { ok: false; error: string }> {
  if (!esUuid(grupoId) || !Array.isArray(estudianteIds) || estudianteIds.length === 0) {
    return { ok: false, error: "Selecciona al menos un estudiante válido." };
  }
  if (estudianteIds.length > MAX_ESTUDIANTES_POR_LOTE || estudianteIds.some((id) => !esUuid(id))) {
    return { ok: false, error: "La selección de estudiantes no es válida." };
  }
  if (!ACCIONES_VALIDAS.has(accion)) return { ok: false, error: "La acción no es válida." };

  const idsUnicos = [...new Set(estudianteIds)];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Entra de nuevo para continuar." };

  const admin = createAdminClient();
  const { data: grupo, error: grupoError } = await admin
    .from("grupos")
    .select("id")
    .eq("id", grupoId)
    .eq("docente_id", user.id)
    .maybeSingle();
  if (grupoError || !grupo) return { ok: false, error: "No tienes permiso sobre este grupo." };

  const { data: estudiantes, error: estudiantesError } = await admin
    .from("estudiantes")
    .select("id")
    .eq("grupo_id", grupoId)
    .in("id", idsUnicos);
  if (estudiantesError) return { ok: false, error: mensajeError(estudiantesError) };
  if ((estudiantes?.length ?? 0) !== idsUnicos.length) {
    return { ok: false, error: "Uno de los estudiantes no pertenece a este grupo." };
  }

  const cambios = accion === "dar_de_baja"
    ? { activo: false, auth_user_id: null, debe_cambiar_nip: true }
    : { activo: true };
  const { error: actualizarError } = await admin
    .from("estudiantes")
    .update(cambios)
    .eq("grupo_id", grupoId)
    .in("id", idsUnicos);
  if (actualizarError) return { ok: false, error: mensajeError(actualizarError) };

  return { ok: true, actualizados: idsUnicos.length };
}
