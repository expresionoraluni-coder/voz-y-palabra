"use client";

import { useState } from "react";
import {
  intentosDeEntregaAuto,
  mejorPuntajeDeEntregaAuto,
  MAX_INTENTOS_AUTO,
} from "@/lib/intentos-auto";

export function useIntentosAuto(
  respuestaPrevia: unknown,
  puntajeAuto: number | null,
  tieneEntregaInicial: boolean,
  maxIntentos = MAX_INTENTOS_AUTO,
) {
  const [intentos, setIntentos] = useState(() => intentosDeEntregaAuto(respuestaPrevia, tieneEntregaInicial));
  const [mejorPuntaje, setMejorPuntaje] = useState(() => mejorPuntajeDeEntregaAuto(respuestaPrevia, puntajeAuto));

  function registrarEntrega(respuesta: unknown, puntajeActual: number | null = mejorPuntaje) {
    setIntentos(intentosDeEntregaAuto(respuesta, true));
    setMejorPuntaje(mejorPuntajeDeEntregaAuto(respuesta, puntajeActual));
  }

  return { intentos, mejorPuntaje, registrarEntrega, maxIntentos };
}
