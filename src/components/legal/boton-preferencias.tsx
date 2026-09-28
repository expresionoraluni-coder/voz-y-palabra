"use client";

import { SlidersHorizontal } from "lucide-react";
import { eventoAbrirPreferencias } from "@/lib/preferencias-privacidad-cliente";

export default function BotonPreferencias() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(eventoAbrirPreferencias))}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      <SlidersHorizontal className="size-4" aria-hidden="true" />
      Gestionar preferencias
    </button>
  );
}
