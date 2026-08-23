"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Boton from "@/components/ui/button";
import ReflexionActividad from "./reflexion-actividad";
import { useEntregaReciente } from "@/lib/entrega-reciente-context";
import { entregaCuentaComoCompletada } from "@/lib/progreso-unidad";
import { useState } from "react";

// La reflexión es una puerta real de navegación: guardar la entrega muestra
// el cierre de la actividad, pero el siguiente paso permanece bloqueado hasta
// que la persona escriba y guarde qué aprendió de esa actividad.
export default function ActividadPostEntrega({
  actividadId,
  confianza,
  textoReflexionPrevio,
  siguienteHref,
  siguienteHrefTrasEntrega,
  textoSiguiente,
  textoSiguienteTrasEntrega,
  placeholderReflexionPersonalizado,
}: {
  actividadId: string;
  confianza: number | null;
  textoReflexionPrevio: string | null;
  siguienteHref: string;
  siguienteHrefTrasEntrega?: string | null;
  textoSiguiente: string;
  textoSiguienteTrasEntrega?: string;
  placeholderReflexionPersonalizado?: string;
}) {
  const { entregaReciente } = useEntregaReciente();
  const [reflexionGuardada, setReflexionGuardada] = useState(Boolean(textoReflexionPrevio));
  if (!entregaReciente) return null;

  const entregaCompletada = entregaCuentaComoCompletada({
    puntaje_auto: entregaReciente.puntajeAuto,
    respuesta: entregaReciente.respuesta,
  });
  const puedeContinuar = entregaCompletada && reflexionGuardada;
  const hrefContinuacion = siguienteHrefTrasEntrega ?? siguienteHref;
  const textoContinuacion = siguienteHrefTrasEntrega
    ? (textoSiguienteTrasEntrega ?? textoSiguiente)
    : textoSiguiente;

  return (
    <>
      <ReflexionActividad
        actividadId={actividadId}
        confianza={confianza}
        puntajeAuto={entregaReciente.puntajeAuto}
        textoPrevio={textoReflexionPrevio}
        placeholderPersonalizado={placeholderReflexionPersonalizado}
        onGuardada={() => setReflexionGuardada(true)}
      />
      {puedeContinuar ? (
        <Link href={hrefContinuacion}>
          <Boton type="button" className="w-full">
            {textoContinuacion}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Boton>
        </Link>
      ) : !entregaCompletada ? (
        <p className="rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-center text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Tu respuesta quedó registrada. Guarda la reflexión para continuar.
        </p>
      ) : (
        <p className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-center text-sm text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
          Guarda tu reflexión para desbloquear el siguiente paso.
        </p>
      )}
    </>
  );
}
