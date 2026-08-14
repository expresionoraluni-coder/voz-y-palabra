"use client";

import { useState } from "react";
import { intentosDeEntregaAuto, mejorPuntajeDeEntregaAuto } from "@/lib/intentos-auto";

export function useIntentosAuto(
  respuestaPrevia: unknown,
  puntajeAuto: number | null,
  tieneEntregaInicial: boolean,
) {
  const [intentos, setIntentos] = useState(() => intentosDeEntregaAuto(respuestaPrevia, tieneEntregaInicial));
  const [mejorPuntaje, setMejorPuntaje] = useState(() => mejorPuntajeDeEntregaAuto(respuestaPrevia, puntajeAuto));

  function registrarEntrega(respuesta: unknown, puntajeActual: number | null = mejorPuntaje) {
    setIntentos(intentosDeEntregaAuto(respuesta, true));
    setMejorPuntaje(mejorPuntajeDeEntregaAuto(respuesta, puntajeActual));
  }

  return { intentos, mejorPuntaje, registrarEntrega };
}
