import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CambiarNipObligatorio from "@/components/cambiar-nip-obligatorio";
import AvisoSinConexion from "@/components/ui/aviso-sin-conexion";
import BottomNav from "./bottom-nav";

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingreso/estudiante");
  if (user.is_anonymous !== true) redirect("/ingreso/estudiante");

  const { data: estudiante } = await supabase
    .from("estudiantes")
    .select("debe_cambiar_nip")
    .single();
  if (!estudiante) redirect("/ingreso/estudiante");

  if (estudiante.debe_cambiar_nip) {
    return <CambiarNipObligatorio />;
  }

  return (
    <>
      <a
        href="#contenido-principal"
        className="sr-only fixed left-3 top-3 z-50 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-indigo-300"
      >
        Saltar al contenido
      </a>
      <main id="contenido-principal" className="pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <AvisoSinConexion />
        {children}
      </main>
      <BottomNav />
    </>
  );
}
