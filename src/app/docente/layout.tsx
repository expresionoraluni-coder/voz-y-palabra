import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Sin esto, cualquier sesión con "authenticated" (incluida la de un
// estudiante, cuyo login también pasa por auth.signInAnonymously()) podía
// navegar directo a una URL de /docente/** — las páginas de esta zona solo
// verificaban `if (!user)`, nunca que la sesión fuera realmente de una
// docente. En unidades/actividades eso exponía la clave de respuesta
// correcta de cualquier actividad de la plataforma a quien conociera o
// adivinara la URL.
export default async function LayoutDocente({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingreso/profesora");

  const { data: docente } = await supabase.from("docentes").select("id").eq("id", user.id).maybeSingle();
  if (!docente) redirect("/ingreso/profesora/verificar");

  return <>{children}</>;
}
