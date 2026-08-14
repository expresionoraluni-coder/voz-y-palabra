"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Heart } from "lucide-react";
import Boton from "@/components/ui/button";
import ReflexionCierre from "../reflexion-cierre";

export default function UnidadCierre({
  estudianteId,
  unidadId,
  metaPrevia,
  textoPrevio,
  confianzaInicioPct,
  promedioUnidad,
  siguienteHref,
  textoSiguiente,
}: {
  estudianteId: string;
  unidadId: string;
  metaPrevia: string | null;
  textoPrevio: string | null;
  confianzaInicioPct: number | null;
  promedioUnidad: number | null;
  siguienteHref: string;
  textoSiguiente: string;
}) {
  const [guardada, setGuardada] = useState(Boolean(textoPrevio));

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5 dark:border-indigo-900 dark:bg-indigo-950/30">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-300">
            <Heart className="size-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold text-slate-900 dark:text-slate-50">Lo que te llevas de esta unidad</p>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              No busques una respuesta perfecta. Escribe con honestidad qué comprendiste, qué te costó y qué quieres recordar.
            </p>
          </div>
        </div>
      </div>

      <ReflexionCierre
        estudianteId={estudianteId}
        unidadId={unidadId}
        metaPrevia={metaPrevia}
        textoPrevio={textoPrevio}
        confianzaInicioPct={confianzaInicioPct}
        promedioUnidad={promedioUnidad}
        onGuardado={() => setGuardada(true)}
      />

      {guardada ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              Reflexión guardada. Ya cerraste esta unidad y puedes avanzar cuando te sientas listo.
            </p>
          </div>
          <Link href={siguienteHref}>
            <Boton type="button" className="w-full">
              {textoSiguiente}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Boton>
          </Link>
        </div>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Guarda tu reflexión para cerrar la unidad y desbloquear la siguiente.
        </p>
      )}
    </div>
  );
}
