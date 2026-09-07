import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import FormularioVerificacionDocente from "./formulario-verificacion";

export default async function VerificarDocente() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous === true) redirect("/ingreso/profesora");

  const admin = createAdminClient();
  const [{ data: administrador }, { data: docente }] = await Promise.all([
    admin.from("administradores").select("id").eq("id", user.id).eq("activo", true).maybeSingle(),
    admin.from("docentes").select("id").eq("id", user.id).maybeSingle(),
  ]);
  if (administrador) redirect("/admin");
  if (docente) redirect("/docente/dashboard");

  return <FormularioVerificacionDocente />;
}
