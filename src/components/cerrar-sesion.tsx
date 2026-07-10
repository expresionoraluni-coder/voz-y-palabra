"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Boton from "@/components/ui/button";

export default function CerrarSesion() {
  const router = useRouter();

  async function salir() {
    const supabase = createClient();
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
