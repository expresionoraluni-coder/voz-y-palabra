"use client";

import Link from "next/link";
import { PartyPopper, ChevronRight } from "lucide-react";
import Boton from "@/components/ui/button";
import ReflexionCierre from "@/app/estudiante/(hub)/unidad/[id]/reflexion-cierre";

// Se muestra en el post-entrega de la actividad que completó la unidad, en
// vez de mandar al estudiante a buscar la reflexión de cierre por su cuenta
// en la página de la unidad — aparece de inmediato, en el mismo lugar donde
// acaba de terminar.
export default function CelebracionUnidad({
  estudianteId,
  unidadId,
  mensajeCelebracion,
  metaPrevia,
  textoReflexionCierrePrevio,
  confianzaInicioPct,
  promedioUnidad,
  siguienteHref,
  textoSiguiente,
}: {
  estudianteId: string;
  unidadId: string;
  mensajeCelebracion: string;
  metaPrevia: string | null;
  textoReflexionCierrePrevio: string | null;
  confianzaInicioPct: number | null;
  promedioUnidad: number | null;
  siguienteHref: string;
  textoSiguiente: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
      <div className="flex items-center gap-2">
        <PartyPopper className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        <p className="text-base font-semibold text-slate-900 dark:text-slate-50">{mensajeCelebracion}</p>
      </div>
      <ReflexionCierre
        estudianteId={estudianteId}
        unidadId={unidadId}
        metaPrevia={metaPrevia}
        textoPrevio={textoReflexionCierrePrevio}
        confianzaInicioPct={confianzaInicioPct}
        promedioUnidad={promedioUnidad}
      />
      <Link href={siguienteHref}>
        <Boton type="button" className="w-full">
          {textoSiguiente}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Boton>
      </Link>
    </div>
  );
}
