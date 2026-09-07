import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import FormularioMfa from "./formulario-mfa";

export default async function VerificarAdministrador() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous === true) redirect("/ingreso/profesora");

  const { data: administrador } = await createAdminClient()
    .from("administradores")
    .select("id")
    .eq("id", user.id)
    .eq("activo", true)
    .maybeSingle();
  if (!administrador) redirect("/ingreso/profesora");

  const [{ data: aal }, { data: factores, error: factoresError }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);
  if (aal?.currentLevel === "aal2") redirect("/admin");
  const factor = factores?.totp?.find((item) => item.status === "verified");
  if (factoresError || !factor) redirect("/admin/seguridad?configurar=1");

  return <FormularioMfa factorId={factor.id} />;
}
