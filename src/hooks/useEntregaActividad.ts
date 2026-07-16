"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/mensaje-error";

type EntregaPayload = {
  respuesta: Record<string, unknown>;
  estado: "completada" | "pendiente_revision";
  puntaje_auto?: number;
};

/**
 * Guarda una entrega (upsert por estudiante+actividad), con el manejo de
 * carga/error compartido por los 8 tipos de actividad. También dispara
 * verificar_insignias tras un guardado exitoso — antes ningún componente lo
 * hacía y las insignias solo se otorgaban si el estudiante visitaba
 * "Mi inicio" después.
 */
export function useEntregaActividad(actividadId: string, estudianteId: string) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(payload: EntregaPayload): Promise<boolean> {
    setError(null);
    setGuardado(false);
    setCargando(true);

    const supabase = createClient();
    const { error: upsertError } = await supabase.from("entregas").upsert(
      {
        estudiante_id: estudianteId,
        actividad_id: actividadId,
        ...payload,
      },
      { onConflict: "estudiante_id,actividad_id" },
    );

    if (upsertError) {
      setError(mensajeError(upsertError));
      setCargando(false);
      return false;
    }

    // No debe bloquear la entrega si falla: otorgar insignias es secundario.
    try {
      await supabase.rpc("verificar_insignias");
    } catch {
      // silencioso a propósito
    }

    setGuardado(true);
    setCargando(false);
    router.refresh();
    return true;
  }

  return { cargando, guardado, error, setError, guardar };
}
