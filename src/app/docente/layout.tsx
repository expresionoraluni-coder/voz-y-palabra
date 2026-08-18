import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ADMINISTRADOR_EMAIL } from "@/lib/admin-constantes";
import AvisoSinConexion from "@/components/ui/aviso-sin-conexion";
import ReportarProblema from "@/components/reportar-problema";

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
  if (!user || user.is_anonymous === true) redirect("/ingreso/profesora");

  if (user.email?.trim().toLowerCase() === ADMINISTRADOR_EMAIL) {
    redirect("/admin");
  }

  const { data: docente } = await supabase.from("docentes").select("id").eq("id", user.id).maybeSingle();
  if (!docente) {
    redirect("/ingreso/profesora/verificar");
  }

  return (
    <>
      <a
        href="#contenido-docente"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Saltar al contenido
      </a>
      <AvisoSinConexion mensaje="Estás sin conexión. Puedes revisar lo que ya está abierto; espera para guardar cambios." />
      <ReportarProblema tipo="docente" docenteId={user.id} />
      <main id="contenido-docente">{children}</main>
    </>
  );
}
