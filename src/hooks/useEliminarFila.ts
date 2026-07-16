"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Borrar una fila por id + estado de carga + refrescar — repetido igual en avisos.tsx y eventos.tsx. */
export function useEliminarFila(tabla: string) {
  const router = useRouter();
  const [borrando, setBorrando] = useState<string | null>(null);

  async function eliminar(id: string) {
    setBorrando(id);
    const supabase = createClient();
    await supabase.from(tabla).delete().eq("id", id);
    setBorrando(null);
    router.refresh();
  }

  return { borrando, eliminar };
}
