"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CerrarSesion() {
  const router = useRouter();

  async function salir() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/ingreso");
    router.refresh();
  }

  return (
    <button
      onClick={salir}
      className="text-sm text-zinc-500 underline dark:text-zinc-400"
    >
      Cerrar sesión
    </button>
  );
}
