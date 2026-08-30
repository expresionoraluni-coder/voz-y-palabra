"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mensajeError } from "@/lib/mensaje-error";
import { normalizarNombre } from "@/lib/normalizar-nombre";
import { esUuid } from "@/lib/validar-entrega";

type Resultado = { ok: true } | { ok: false; error: string };

async function validarDocenteYEstudiante(estudianteId: string) {
  if (!esUuid(estudianteId)) return { ok: false as const, error: "El estudiante no es válido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Tu sesión expiró. Entra de nuevo para continuar." };

  const admin = createAdminClient();
  const { data: estudiante, error } = await admin
    .from("estudiantes")
    .select("id, grupo_id")
    .eq("id", estudianteId)
    .maybeSingle();
  if (error || !estudiante) return { ok: false as const, error: "No encontramos este estudiante." };

  const { data: grupo } = await admin
    .from("grupos")
    .select("id")
    .eq("id", estudiante.grupo_id)
    .eq("docente_id", user.id)
    .maybeSingle();
  if (!grupo) return { ok: false as const, error: "No tienes permiso sobre este estudiante." };

  return { ok: true as const, admin, estudiante };
}

export async function darDeBajaEstudiante(estudianteId: string): Promise<Resultado> {
  const acceso = await validarDocenteYEstudiante(estudianteId);
  if (!acceso.ok) return acceso;

  const { error } = await acceso.admin
    .from("estudiantes")
    .update({ activo: false, auth_user_id: null, debe_cambiar_nip: true })
    .eq("id", estudianteId);
  return error ? { ok: false, error: mensajeError(error) } : { ok: true };
}

export async function reactivarEstudiante(estudianteId: string): Promise<Resultado> {
  const acceso = await validarDocenteYEstudiante(estudianteId);
  if (!acceso.ok) return acceso;

  const { error } = await acceso.admin.from("estudiantes").update({ activo: true }).eq("id", estudianteId);
  return error ? { ok: false, error: mensajeError(error) } : { ok: true };
}

export async function eliminarEstudiante(estudianteId: string): Promise<Resultado> {
  const acceso = await validarDocenteYEstudiante(estudianteId);
  if (!acceso.ok) return acceso;

  const grupoId = acceso.estudiante.grupo_id;
  const { error } = await acceso.admin.from("estudiantes").delete().eq("id", estudianteId);
  if (error) return { ok: false, error: mensajeError(error) };

  const { count, error: verificarError } = await acceso.admin
    .from("estudiantes")
    .select("id", { count: "exact", head: true })
    .eq("id", estudianteId);
  if (verificarError) return { ok: false, error: mensajeError(verificarError) };
  if ((count ?? 0) !== 0) return { ok: false, error: "No se pudo confirmar la eliminación del estudiante." };

  revalidatePath(`/docente/grupos/${grupoId}`);
  revalidatePath(`/docente/estudiantes/${estudianteId}`);
  return { ok: true };
}

export async function editarEstudiante(
  estudianteId: string,
  nombre: string,
  boleta: string,
): Promise<Resultado> {
  const acceso = await validarDocenteYEstudiante(estudianteId);
  if (!acceso.ok) return acceso;

  const nombreNormalizado = normalizarNombre(nombre);
  const boletaNormalizada = boleta.replace(/\D/g, "");
  if (nombreNormalizado.length < 2 || nombreNormalizado.length > 200) {
    return { ok: false, error: "El nombre no es válido." };
  }
  if (boletaNormalizada && (boletaNormalizada.length < 4 || boletaNormalizada.length > 20)) {
    return { ok: false, error: "La boleta debe tener entre 4 y 20 dígitos." };
  }

  const { error } = await acceso.admin
    .from("estudiantes")
    .update({ nombre: nombreNormalizado, boleta: boletaNormalizada || null })
    .eq("id", estudianteId);
  return error ? { ok: false, error: mensajeError(error) } : { ok: true };
}
