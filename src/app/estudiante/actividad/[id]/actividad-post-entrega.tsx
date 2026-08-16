"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Boton from "@/components/ui/button";
import ReflexionActividad from "./reflexion-actividad";
import { useEntregaReciente } from "@/lib/entrega-reciente-context";
import { useState } from "react";

// La reflexión es una puerta real de navegación: guardar la entrega muestra
// el cierre de la actividad, pero el siguiente paso permanece bloqueado hasta
// que la persona escriba y guarde qué aprendió de ese intento.
export default function ActividadPostEntrega({
  actividadId,
  estudianteId,
  confianza,
  textoReflexionPrevio,
  siguienteHref,
  textoSiguiente,
  placeholderReflexionPersonalizado,
}: {
  actividadId: string;
  estudianteId: string;
  confianza: number | null;
  textoReflexionPrevio: string | null;
  siguienteHref: string;
  textoSiguiente: string;
  placeholderReflexionPersonalizado?: string;
}) {
  const { entregaReciente } = useEntregaReciente();
  const [reflexionGuardada, setReflexionGuardada] = useState(Boolean(textoReflexionPrevio));
  if (!entregaReciente) return null;

  return (
    <>
      <ReflexionActividad
        actividadId={actividadId}
        estudianteId={estudianteId}
        confianza={confianza}
        puntajeAuto={entregaReciente.puntajeAuto}
        textoPrevio={textoReflexionPrevio}
        placeholderPersonalizado={placeholderReflexionPersonalizado}
        onGuardada={() => setReflexionGuardada(true)}
      />
      {reflexionGuardada ? (
        <Link href={siguienteHref}>
          <Boton type="button" className="w-full">
            {textoSiguiente}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Boton>
        </Link>
      ) : (
        <p className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-center text-sm text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
          Guarda tu reflexión para desbloquear el siguiente paso.
        </p>
      )}
    </>
  );
}
