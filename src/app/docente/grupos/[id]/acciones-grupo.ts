"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mensajeError } from "@/lib/mensaje-error";
import { esUuid } from "@/lib/validar-entrega";

type Resultado = { ok: true } | { ok: false; error: string };

export async function eliminarGrupo(grupoId: string): Promise<Resultado> {
  if (!esUuid(grupoId)) return { ok: false, error: "El grupo no es válido." };

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

  const { error: eliminarError } = await admin.from("grupos").delete().eq("id", grupoId);
  if (eliminarError) return { ok: false, error: mensajeError(eliminarError) };

  const { count, error: verificarError } = await admin
    .from("grupos")
    .select("id", { count: "exact", head: true })
    .eq("id", grupoId);
  if (verificarError) return { ok: false, error: mensajeError(verificarError) };
  if ((count ?? 0) !== 0) return { ok: false, error: "No se pudo confirmar la eliminación del grupo." };

  revalidatePath("/docente/dashboard");
  revalidatePath(`/docente/grupos/${grupoId}`);
  return { ok: true };
}
