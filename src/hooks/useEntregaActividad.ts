"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEntregaReciente } from "@/lib/entrega-reciente-context";
import type { ResultadoCalificacion } from "@/app/estudiante/actividad/[id]/acciones-calificacion";

/**
 * Maneja el guardado de una entrega (carga/error compartido por los 11
 * tipos de actividad) delegando siempre a una Server Action —
 * `guardarConAccion` es el único camino de escritura: el estudiante ya no
 * tiene permiso de escritura directa sobre `entregas` vía RLS (ver
 * hardening de seguridad, sub-fase 5), así que un upsert directo desde el
 * cliente fallaría de todas formas.
 */
export function useEntregaActividad(actividadId: string, estudianteId: string) {
  const router = useRouter();
  const { marcarGuardada } = useEntregaReciente();
  const [cargando, setCargando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si el estudiante sigue editando después de guardar, "Guardado" se queda
  // pegado en pantalla mintiendo que el cambio nuevo ya se guardó — los
  // componentes deben llamar esto en cada edición posterior al envío.
  function marcarSinGuardar() {
    setGuardado((g) => (g ? false : g));
  }

  // Para los tipos con clave de calificación secreta: en vez de calcular el
  // puntaje en el cliente y hacer upsert directo, se invoca una Server
  // Action (ver acciones-calificacion.ts) que recalcula todo del lado del
  // servidor y guarda ella misma la entrega — aquí solo se refleja el
  // resultado ya calificado que devuelve, nunca se recalcula nada.
  async function guardarConAccion(
    accion: () => Promise<ResultadoCalificacion>,
  ): Promise<Record<string, unknown> | null> {
    setError(null);
    setGuardado(false);
    setCargando(true);

    const resultado = await accion();

    if (!resultado.ok) {
      setError(resultado.error);
      setCargando(false);
      return null;
    }

    marcarGuardada({ puntajeAuto: resultado.puntajeAuto, respuesta: resultado.respuesta });
    setGuardado(true);
    setCargando(false);
    router.refresh();
    return resultado.respuesta;
  }

  return { cargando, guardado, error, setError, guardarConAccion, marcarSinGuardar };
}
