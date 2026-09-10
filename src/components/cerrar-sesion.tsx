"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Boton from "@/components/ui/button";
import { limpiarBorradoresLocales } from "@/hooks/use-borrador-local";

export default function CerrarSesion() {
  const router = useRouter();

  async function salir() {
    const supabase = createClient();
    limpiarBorradoresLocales();
    await supabase.auth.signOut();
    router.push("/ingreso");
    router.refresh();
  }

  return (
    <Boton variant="ghost" size="sm" onClick={salir}>
      <LogOut className="size-4" aria-hidden="true" />
      Salir
    </Boton>
  );
}
