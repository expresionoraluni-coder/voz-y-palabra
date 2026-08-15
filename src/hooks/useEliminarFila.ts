"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/mensaje-error";

/** Borrar una fila por id + estado de carga + refrescar — repetido igual en avisos.tsx y eventos.tsx. */
export function useEliminarFila(tabla: string) {
  const router = useRouter();
  const [borrando, setBorrando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function eliminar(id: string, mensajeConfirmacion: string) {
    if (borrando) return;
    if (!window.confirm(mensajeConfirmacion)) return;
    setError(null);
    setBorrando(id);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from(tabla).delete().eq("id", id);
    setBorrando(null);
    if (deleteError) {
      setError(mensajeError(deleteError));
      return;
    }
    router.refresh();
  }

  return { borrando, error, eliminar };
}
