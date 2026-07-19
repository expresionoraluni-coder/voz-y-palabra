"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type EntregaReciente = { puntajeAuto: number | null; respuesta: Record<string, unknown> } | null;

type EntregaRecienteContextValue = {
  entregaReciente: EntregaReciente;
  marcarGuardada: (datos: { puntajeAuto: number | null; respuesta: Record<string, unknown> }) => void;
};

const EntregaRecienteContext = createContext<EntregaRecienteContextValue>({
  entregaReciente: null,
  marcarGuardada: () => {},
});

// Permite que la retroalimentación/reflexión de la actividad aparezca al
// instante tras guardar, sin esperar el viaje completo de router.refresh()
// al servidor — useEntregaActividad llama marcarGuardada() justo después
// del upsert exitoso, antes de refrescar.
export function EntregaRecienteProvider({
  inicial,
  children,
}: {
  inicial: EntregaReciente;
  children: ReactNode;
}) {
  const [entregaReciente, setEntregaReciente] = useState<EntregaReciente>(inicial);
  return (
    <EntregaRecienteContext.Provider value={{ entregaReciente, marcarGuardada: setEntregaReciente }}>
      {children}
    </EntregaRecienteContext.Provider>
  );
}

export function useEntregaReciente() {
  return useContext(EntregaRecienteContext);
}
