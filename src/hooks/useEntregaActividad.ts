"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/mensaje-error";
import { useEntregaReciente } from "@/lib/entrega-reciente-context";

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
  const { marcarGuardada } = useEntregaReciente();
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

    // Otorgar insignias es secundario: ni bloquea la entrega si falla, ni
    // vale la pena esperarlo antes de mostrar la retroalimentación — se
    // dispara sin esperar (antes un await aquí sumaba un viaje de red
    // completo a la percepción de lentitud tras cada entrega).
    void (async () => {
      try {
        await supabase.rpc("verificar_insignias");
      } catch {
        // silencioso a propósito
      }
    })();

    // Aparece al instante sin esperar el refresh del servidor; el refresh
    // sigue corriendo de fondo para mantener todo lo demás sincronizado.
    marcarGuardada({ puntajeAuto: payload.puntaje_auto ?? null, respuesta: payload.respuesta });

    setGuardado(true);
    setCargando(false);
    router.refresh();
    return true;
  }

  // Si el estudiante sigue editando después de guardar, "Guardado" se queda
  // pegado en pantalla mintiendo que el cambio nuevo ya se guardó — los
  // componentes deben llamar esto en cada edición posterior al envío.
  function marcarSinGuardar() {
    setGuardado((g) => (g ? false : g));
  }

  return { cargando, guardado, error, setError, guardar, marcarSinGuardar };
}
