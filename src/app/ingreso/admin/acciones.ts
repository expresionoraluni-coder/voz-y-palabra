"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Clasifica la sesión actual usando la provisión interna, no el correo.
 * Devuelve solo un booleano porque el cliente no necesita datos del perfil.
 */
export async function comprobarAdministradorProvisionado() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.is_anonymous === true || !user.email_confirmed_at) return false;

  const { data: administrador } = await createAdminClient()
    .from("administradores")
    .select("id")
    .eq("id", user.id)
    .eq("activo", true)
    .maybeSingle();

  return Boolean(administrador);
}
