"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, LockKeyhole, PartyPopper } from "lucide-react";
import Boton from "@/components/ui/button";

export default function CelebracionUnidad({
  mensajeCelebracion,
  reflexionGuardada,
  siguienteHref,
  textoSiguiente,
}: {
  mensajeCelebracion: string;
  reflexionGuardada: boolean;
  siguienteHref: string;
  textoSiguiente: string;
}) {
  return (
    <section
      aria-labelledby="fin-de-unidad"
      className="flex flex-col gap-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900 dark:bg-emerald-950/30"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/60">
          <PartyPopper className="size-5 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 id="fin-de-unidad" className="text-base font-semibold text-slate-900 dark:text-slate-50">
            {mensajeCelebracion}
          </h2>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            Terminaste todas las actividades. Antes de abrir el cierre de la unidad, revisa cómo te fue en esta última.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl bg-white/70 px-3.5 py-3 dark:bg-slate-900/50">
        {reflexionGuardada ? (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        ) : (
          <LockKeyhole className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        )}
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {reflexionGuardada
            ? "La reflexión de esta actividad está guardada. Ya puedes pasar a la reflexión final de la unidad."
            : "Guarda primero la reflexión de esta actividad. Después podrás escribir la reflexión final de la unidad en una pantalla aparte."}
        </p>
      </div>

      {reflexionGuardada ? (
        <Link href={siguienteHref}>
          <Boton type="button" className="w-full">
            {textoSiguiente}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Boton>
        </Link>
      ) : (
        <Boton type="button" disabled className="w-full">
          Guarda la reflexión para continuar
        </Boton>
      )}
    </section>
  );
}
