import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

const TIEMPO_INACTIVIDAD_ADMIN_MS = 30 * 60 * 1000;

function obtenerIdSesion(accessToken: string | undefined) {
  if (!accessToken) return null;
  try {
    const parte = accessToken.split(".")[1];
    if (!parte) return null;
    const datos = JSON.parse(Buffer.from(parte, "base64url").toString("utf8")) as { session_id?: unknown };
    return typeof datos.session_id === "string" ? datos.session_id : null;
  } catch {
    return null;
  }
}

async function registrarActividadSesionAdmin(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  sessionId: string,
) {
  const { data: actividad } = await admin
    .from("admin_session_activity")
    .select("user_id, last_seen_at")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (actividad?.user_id && actividad.user_id !== userId) return false;
  if (actividad?.last_seen_at && Date.now() - new Date(actividad.last_seen_at).getTime() > TIEMPO_INACTIVIDAD_ADMIN_MS) {
    return false;
  }

  const { error } = await admin.from("admin_session_activity").upsert(
    { session_id: sessionId, user_id: userId, last_seen_at: new Date().toISOString() },
    { onConflict: "session_id" },
  );
  return !error;
}

const cargarAdministrador = cache(async function cargarAdministrador(): Promise<ContextoAdministrador | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    !user ||
    user.is_anonymous === true ||
    !user.email_confirmed_at
  ) {
    return null;
  }

  const { data: sesion } = await supabase.auth.getSession();
  const sessionId = obtenerIdSesion(sesion.session?.access_token);
  if (!sessionId) return null;

  // La tabla administradores es la autoridad de provisión. El correo solo
  // identifica la cuenta en Auth; no debe ser una lista de permisos paralela.
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

  // La interfaz administrativa verifica códigos TOTP; no se consideran
  // factores de otro tipo que esta aplicación no sabe desafiar.
  const tieneFactorVerificado = (factores?.totp ?? []).some((factor) => factor.status === "verified");
  const nivelActual = aal?.currentLevel ?? null;
  if (!(await registrarActividadSesionAdmin(admin, user.id, sessionId))) return null;

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
});

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
