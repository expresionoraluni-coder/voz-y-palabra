import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CambiarNipObligatorio from "@/components/cambiar-nip-obligatorio";
import BottomNav from "./bottom-nav";

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingreso/estudiante");

  const { data: estudiante } = await supabase
    .from("estudiantes")
    .select("debe_cambiar_nip")
    .eq("auth_user_id", user.id)
    .single();
  if (!estudiante) redirect("/ingreso/estudiante");

  if (estudiante.debe_cambiar_nip) {
    return <CambiarNipObligatorio />;
  }

  return (
    <>
      <div className="pb-20">{children}</div>
      <BottomNav />
    </>
  );
}
