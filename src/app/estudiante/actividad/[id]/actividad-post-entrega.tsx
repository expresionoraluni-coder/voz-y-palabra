"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import Boton from "@/components/ui/button";
import ReflexionActividad from "./reflexion-actividad";
import CelebracionUnidad from "./celebracion-unidad";
import { useEntregaReciente } from "@/lib/entrega-reciente-context";

type UnidadCompletada = {
  mensajeCelebracion: string;
  siguienteHref: string;
  textoSiguiente: string;
};

// Su visibilidad depende del contexto (cliente), no de props del servidor,
// a propósito: así aparece al instante justo tras guardar, sin esperar el
// viaje completo de router.refresh().
export default function ActividadPostEntrega({
  actividadId,
  estudianteId,
  confianza,
  textoReflexionPrevio,
  siguienteHref,
  textoSiguiente,
  placeholderReflexionPersonalizado,
  unidadCompletada,
}: {
  actividadId: string;
  estudianteId: string;
  confianza: number | null;
  textoReflexionPrevio: string | null;
  siguienteHref: string;
  textoSiguiente: string;
  placeholderReflexionPersonalizado?: string;
  unidadCompletada?: UnidadCompletada | null;
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
      {unidadCompletada ? (
        <CelebracionUnidad
          mensajeCelebracion={unidadCompletada.mensajeCelebracion}
          reflexionGuardada={reflexionGuardada}
          siguienteHref={unidadCompletada.siguienteHref}
          textoSiguiente={unidadCompletada.textoSiguiente}
        />
      ) : (
        <Link href={siguienteHref}>
          <Boton type="button" className="w-full">
            {textoSiguiente}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Boton>
        </Link>
      )}
    </>
  );
}
