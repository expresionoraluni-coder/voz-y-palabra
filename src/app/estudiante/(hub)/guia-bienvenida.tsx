"use client";

import Link from "next/link";
import { BookOpen, CheckCircle2, CircleHelp, X } from "lucide-react";
import { useEffect, useState } from "react";

export const CLAVE_GUIA = "voz-y-palabra:guia-bienvenida:v1";

export default function GuiaBienvenida({
  estudianteId,
  unidadHref,
  actividadHref,
  actividadDisponible,
}: {
  estudianteId: string;
  unidadHref: string;
  actividadHref: string;
  actividadDisponible: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setVisible(window.localStorage.getItem(`${CLAVE_GUIA}:${estudianteId}`) !== "oculta");
      } catch {
        setVisible(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [estudianteId]);

  function ocultarGuia() {
    try {
      window.localStorage.setItem(`${CLAVE_GUIA}:${estudianteId}`, "oculta");
    } catch {
      // Si el navegador bloquea el almacenamiento, todavía se puede cerrar durante esta visita.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <section
      aria-labelledby="guia-bienvenida"
      className="flex flex-col gap-4 rounded-2xl border border-violet-200 bg-violet-50/70 p-4 dark:border-violet-900 dark:bg-violet-950/30"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
          <BookOpen className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="guia-bienvenida" className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Tu primera ruta
          </h2>
          <p className="mt-0.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Tres pasos para empezar sin perderte. La tarjeta morada te dirá qué hacer después.
          </p>
        </div>
        <button
          type="button"
          onClick={ocultarGuia}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-white/70 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:hover:bg-slate-900/60 dark:hover:text-slate-50"
          aria-label="Cerrar guía de bienvenida"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <ol className="grid gap-2 sm:grid-cols-3">
        <li className="flex items-start gap-2 rounded-xl bg-white/70 p-3 dark:bg-slate-900/50">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-900 dark:text-violet-200">
            1
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Define tu meta</p>
            <Link
              href={unidadHref}
              className="mt-1 inline-flex min-h-8 items-center text-sm font-medium text-violet-700 underline-offset-2 hover:underline dark:text-violet-300"
            >
              Ir a la unidad
            </Link>
          </div>
        </li>
        <li className="flex items-start gap-2 rounded-xl bg-white/70 p-3 dark:bg-slate-900/50">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-900 dark:text-violet-200">
            2
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {actividadDisponible ? "Prueba una actividad" : "Conoce tu ruta"}
            </p>
            <Link
              href={actividadHref}
              className="mt-1 inline-flex min-h-8 items-center text-sm font-medium text-violet-700 underline-offset-2 hover:underline dark:text-violet-300"
            >
              {actividadDisponible ? "Ver actividad" : "Ver unidad"}
            </Link>
          </div>
        </li>
        <li className="flex items-start gap-2 rounded-xl bg-white/70 p-3 dark:bg-slate-900/50">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-900 dark:text-violet-200">
            3
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Revisa tu avance</p>
            <Link
              href="/estudiante/progreso"
              className="mt-1 inline-flex min-h-8 items-center gap-1 text-sm font-medium text-violet-700 underline-offset-2 hover:underline dark:text-violet-300"
            >
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              Ver progreso
            </Link>
          </div>
        </li>
      </ol>

      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <CircleHelp className="size-3.5 shrink-0" aria-hidden="true" />
        <span>Las actividades se desbloquean paso a paso. Guarda cada respuesta; no necesitas terminar todo en una sola sesión.</span>
      </div>
    </section>
  );
}
