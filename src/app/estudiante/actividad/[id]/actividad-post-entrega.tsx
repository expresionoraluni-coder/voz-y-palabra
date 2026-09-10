"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ReflexionActividad from "./reflexion-actividad";
import { useEntregaReciente } from "@/lib/entrega-reciente-context";
import { entregaCuentaComoCompletada } from "@/lib/progreso-unidad";
import { requiereReintentoAlternativo } from "@/lib/intentos-auto";
import { useState } from "react";

// La reflexión es parte obligatoria de cada actividad: la navegación solo se
// habilita cuando la entrega y esta pausa formativa quedaron guardadas.
export default function ActividadPostEntrega({
  actividadId,
  estudianteId,
  confianza,
  textoReflexionPrevio,
  siguienteHref,
  siguienteHrefTrasEntrega,
  textoSiguiente,
  textoSiguienteTrasEntrega,
  placeholderReflexionPersonalizado,
  reintentoAlternativoDisponible,
}: {
  actividadId: string;
  estudianteId: string;
  confianza: number | null;
  textoReflexionPrevio: string | null;
  siguienteHref: string;
  siguienteHrefTrasEntrega?: string | null;
  textoSiguiente: string;
  textoSiguienteTrasEntrega?: string;
  placeholderReflexionPersonalizado?: string;
  reintentoAlternativoDisponible?: boolean;
}) {
  const { entregaReciente } = useEntregaReciente();
  const [reflexionGuardada, setReflexionGuardada] = useState(Boolean(textoReflexionPrevio));
  if (!entregaReciente) return null;

  const contenidoConReintento = reintentoAlternativoDisponible ? { reintento_alternativo: {} } : null;
  const reintentoObligatorio = requiereReintentoAlternativo(
    contenidoConReintento,
    entregaReciente.respuesta,
    entregaReciente.puntajeAuto,
  );
  const entregaCompletada = entregaCuentaComoCompletada({
    puntaje_auto: entregaReciente.puntajeAuto,
    respuesta: entregaReciente.respuesta,
  }, contenidoConReintento);
  const puedeContinuar = entregaCompletada && reflexionGuardada && !reintentoObligatorio;
  const hrefContinuacion = siguienteHrefTrasEntrega ?? siguienteHref;
  const textoContinuacion = siguienteHrefTrasEntrega
    ? (textoSiguienteTrasEntrega ?? textoSiguiente)
    : textoSiguiente;

  return (
    <>
      <ReflexionActividad
        actividadId={actividadId}
        estudianteId={estudianteId}
        confianza={confianza}
        puntajeAuto={entregaReciente.puntajeAuto}
        textoPrevio={textoReflexionPrevio}
        bloqueadaPorReintento={reintentoObligatorio}
        placeholderPersonalizado={placeholderReflexionPersonalizado}
        onGuardada={() => setReflexionGuardada(true)}
      />
      {puedeContinuar ? (
        <Link
          href={hrefContinuacion}
          className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 text-sm font-medium text-white transition-[color,background-color,border-color,transform] duration-150 hover:bg-indigo-700 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
        >
          {textoContinuacion}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        !reintentoObligatorio && (
          <p className="rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-center text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            {entregaCompletada ? "Guarda tu reflexión para continuar." : "Guarda tu respuesta para continuar."}
          </p>
        )
      )}
    </>
  );
}
