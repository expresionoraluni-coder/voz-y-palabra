"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Boton from "@/components/ui/button";
import ReflexionActividad from "./reflexion-actividad";
import { useEntregaReciente } from "@/lib/entrega-reciente-context";

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
}: {
  actividadId: string;
  estudianteId: string;
  confianza: number | null;
  textoReflexionPrevio: string | null;
  siguienteHref: string;
  textoSiguiente: string;
}) {
  const { entregaReciente } = useEntregaReciente();
  if (!entregaReciente) return null;

  return (
    <>
      <ReflexionActividad
        actividadId={actividadId}
        estudianteId={estudianteId}
        confianza={confianza}
        puntajeAuto={entregaReciente.puntajeAuto}
        textoPrevio={textoReflexionPrevio}
      />
      <Link href={siguienteHref}>
        <Boton type="button" className="w-full">
          {textoSiguiente}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Boton>
      </Link>
    </>
  );
}
