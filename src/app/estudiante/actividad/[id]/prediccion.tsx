"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Target } from "lucide-react";
import { ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import { guardarPrediccionActividad } from "../../acciones-reflexiones";

export default function Prediccion({
  actividadId,
}: {
  actividadId: string;
}) {
  const router = useRouter();
  const [confianza, setConfianza] = useState<number | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cargando) return;
    setError(null);
    setCargando(true);

    try {
      if (confianza === null) return;
      const resultado = await guardarPrediccionActividad(actividadId, confianza);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }

      router.refresh();
    } catch {
      setError("No pudimos guardar tu nivel de seguridad. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative flex flex-col gap-4 overflow-hidden rounded-[1.5rem] border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/70 p-5 shadow-sm dark:border-indigo-900/70 dark:from-indigo-950/40 dark:via-slate-900 dark:to-violet-950/25">
      <div aria-hidden="true" className="absolute -right-8 -top-8 size-28 rounded-full bg-violet-200/45 blur-2xl dark:bg-violet-800/20" />
      <div className="relative flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/25"><Target className="size-5" aria-hidden="true" /></span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-600 dark:text-indigo-400">Antes de empezar</p>
          <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-slate-50">¿Qué tanta seguridad tienes para resolver bien esta actividad?</p>
        </div>
      </div>
      <div className="relative flex flex-col gap-2">
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setConfianza(n)}
              aria-pressed={confianza === n}
              aria-label={`${n} de 5`}
              className={`flex min-h-11 items-center justify-center rounded-2xl text-sm font-bold transition-[color,background-color,transform,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:scale-95 ${
                confianza === n
                  ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/25"
                  : "border border-white bg-white/80 text-slate-500 hover:-translate-y-0.5 hover:bg-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-indigo-950"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <span>Menos seguridad</span>
          <span>Más seguridad</span>
        </div>
      </div>
      {confianza !== null && <p className="relative flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300"><Sparkles className="size-3.5" aria-hidden="true" /> Registraste {confianza} de 5 como tu punto de partida.</p>}
      {error && <ErrorText>{error}</ErrorText>}
      <Boton type="submit" size="sm" disabled={confianza === null} cargando={cargando} className="relative self-start">
        {cargando ? "Guardando…" : "Empezar la actividad"}
      </Boton>
    </form>
  );
}
