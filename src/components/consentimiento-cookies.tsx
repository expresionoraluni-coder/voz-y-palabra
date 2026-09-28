"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart3, Check, ChevronDown, ShieldCheck } from "lucide-react";
import {
  eventoAbrirPreferencias,
  guardarPreferenciasPrivacidad,
  leerPreferenciasPrivacidad,
} from "@/lib/preferencias-privacidad-cliente";

export default function ConsentimientoCookies() {
  const [listo, setListo] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [medicion, setMedicion] = useState(false);

  useEffect(() => {
    const marco = window.requestAnimationFrame(() => {
      const preferencias = leerPreferenciasPrivacidad();
      setMedicion(preferencias?.medicion ?? false);
      setAbierto(preferencias === null);
      setListo(true);
    });

    const abrirPanel = () => {
      const actuales = leerPreferenciasPrivacidad();
      setMedicion(actuales?.medicion ?? false);
      setAbierto(true);
    };
    window.addEventListener(eventoAbrirPreferencias, abrirPanel);
    return () => {
      window.cancelAnimationFrame(marco);
      window.removeEventListener(eventoAbrirPreferencias, abrirPanel);
    };
  }, []);

  if (!listo || !abierto) return null;

  function guardar() {
    guardarPreferenciasPrivacidad(medicion);
    setAbierto(false);
  }

  function soloNecesarias() {
    setMedicion(false);
    guardarPreferenciasPrivacidad(false);
    setAbierto(false);
  }

  return (
    <aside
      aria-labelledby="preferencias-privacidad-titulo"
      className="fixed bottom-3 right-3 z-[60] w-[calc(100%-1.5rem)] max-w-sm rounded-[1.55rem] border border-indigo-200/80 bg-white/95 p-4 shadow-2xl shadow-slate-950/20 backdrop-blur-xl dark:border-indigo-900/80 dark:bg-slate-900/95 sm:bottom-5 sm:right-5 sm:p-5"
    >
      <div className="flex gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-indigo-700 dark:text-indigo-300">Tu privacidad</p>
          <h2 id="preferencias-privacidad-titulo" className="mt-0.5 text-base font-bold text-slate-900 dark:text-slate-50">Elige qué medición permites</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Las cookies necesarias mantienen tu sesión segura. No usamos publicidad ni rastreo comercial. Puedes permitir o rechazar la medición opcional de uso.
          </p>
        </div>
      </div>

      <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-700 transition hover:border-indigo-200 dark:border-slate-700 dark:bg-slate-950/45 dark:text-slate-200">
        <input
          type="checkbox"
          checked={medicion}
          onChange={(event) => setMedicion(event.target.checked)}
          className="mt-0.5 size-4 accent-indigo-600"
        />
        <span>
          <span className="flex items-center gap-1.5 font-semibold"><BarChart3 className="size-4 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />Permitir medición de uso</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">Sirve para saber si la ayuda funciona. No activa publicidad ni comparte tus respuestas del curso.</span>
        </span>
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={soloNecesarias} className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
          Solo necesarias
        </button>
        <button type="button" onClick={guardar} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950">
          <Check className="size-4" aria-hidden="true" />
          Guardar elección
        </button>
        <Link href="/cookies" className="ml-auto inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-indigo-700 underline underline-offset-2 hover:text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-100">
          Ver detalles <ChevronDown className="size-3.5 -rotate-90" aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
