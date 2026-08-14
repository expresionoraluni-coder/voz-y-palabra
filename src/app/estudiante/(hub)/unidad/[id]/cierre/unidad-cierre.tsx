"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Heart } from "lucide-react";
import Boton from "@/components/ui/button";
import ReflexionCierre from "../reflexion-cierre";
import Confianza from "../confianza";

export default function UnidadCierre({
  estudianteId,
  unidadId,
  metaPrevia,
  textoPrevio,
  confianzaInicioPct,
  confianzaCierrePct,
  promedioUnidad,
  siguienteHref,
  textoSiguiente,
}: {
  estudianteId: string;
  unidadId: string;
  metaPrevia: string | null;
  textoPrevio: string | null;
  confianzaInicioPct: number | null;
  confianzaCierrePct: number | null;
  promedioUnidad: number | null;
  siguienteHref: string;
  textoSiguiente: string;
}) {
  const [guardada, setGuardada] = useState(Boolean(textoPrevio));
  const [confianzaGuardada, setConfianzaGuardada] = useState(confianzaCierrePct !== null);

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
              ¡Buen trabajo por llegar hasta aquí! No busques una respuesta perfecta. Escribe con honestidad qué comprendiste, qué te costó y qué quieres recordar.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3.5 dark:border-emerald-900 dark:bg-emerald-950/30">
        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Tu esfuerzo cuenta</p>
        <p className="mt-1 text-sm leading-relaxed text-emerald-800 dark:text-emerald-300">
          Cada intento te ayudó a practicar. Reconocer lo que ya puedes hacer también forma parte de aprender.
        </p>
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

      <Confianza
        estudianteId={estudianteId}
        unidadId={unidadId}
        momento="cierre"
        valorPrevio={confianzaCierrePct}
        onGuardado={() => setConfianzaGuardada(true)}
      />

      {guardada && confianzaGuardada ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              ¡Muy bien! Tu reflexión quedó guardada. Ya cerraste esta unidad y puedes continuar cuando quieras.
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
          Guarda tu reflexión y tu nivel de seguridad para cerrar la unidad y desbloquear la siguiente.
        </p>
      )}
    </div>
  );
}
