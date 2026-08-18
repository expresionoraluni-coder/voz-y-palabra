import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMINISTRADOR_EMAIL } from "@/lib/admin-constantes";

type ContextoAdministrador = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
  administrador: { id: string; nombre: string; activo: boolean };
  mfa: {
    tieneFactorVerificado: boolean;
    nivelActual: string | null;
    requiereSegundoFactor: boolean;
  };
};

async function cargarAdministrador(): Promise<ContextoAdministrador | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    !user ||
    user.is_anonymous === true ||
    !user.email_confirmed_at ||
    user.email?.trim().toLowerCase() !== ADMINISTRADOR_EMAIL
  ) {
    return null;
  }

  // Se consulta únicamente la fila cuyo id coincide con auth.uid(). El
  // cliente de servidor evita que el bloqueo AAL2 de RLS impida detectar que
  // una cuenta administrativa necesita completar el segundo factor.
  const admin = createAdminClient();
  const { data: administrador } = await admin
    .from("administradores")
    .select("id, nombre, activo")
    .eq("id", user.id)
    .maybeSingle();

  if (!administrador?.activo) return null;

  const [{ data: factores, error: factoresError }, { data: aal, error: aalError }] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);

  // Para el perfil más sensible, un error al consultar el estado MFA no debe
  // degradarse silenciosamente a una sesión administrativa sin segundo factor.
  if (factoresError || aalError) return null;

  const tieneFactorVerificado = (factores?.totp ?? []).some((factor) => factor.status === "verified") ||
    (factores?.phone ?? []).some((factor) => factor.status === "verified") ||
    (factores?.webauthn ?? []).some((factor) => factor.status === "verified");
  const nivelActual = aal?.currentLevel ?? null;

  return {
    supabase,
    user,
    administrador,
    mfa: {
      tieneFactorVerificado,
      nivelActual,
      requiereSegundoFactor: tieneFactorVerificado && nivelActual !== "aal2",
    },
  };
}

export async function obtenerAdministrador() {
  const contexto = await cargarAdministrador();
  if (!contexto || !contexto.mfa.tieneFactorVerificado || contexto.mfa.nivelActual !== "aal2") return null;
  return contexto;
}

export async function requerirAdministrador(opciones: { permitirConfiguracionMfa?: boolean } = {}) {
  const resultado = await cargarAdministrador();
  if (!resultado) redirect("/ingreso/profesora");

  if (resultado.mfa.requiereSegundoFactor) {
    redirect("/ingreso/admin/verificar");
  }

  if (!resultado.mfa.tieneFactorVerificado && !opciones.permitirConfiguracionMfa) {
    redirect("/admin/seguridad?configurar=1");
  }

  return resultado;
}
