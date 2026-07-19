"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Target } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/mensaje-error";
import { ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

export default function Prediccion({
  actividadId,
  estudianteId,
}: {
  actividadId: string;
  estudianteId: string;
}) {
  const router = useRouter();
  const [confianza, setConfianza] = useState<number | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const supabase = createClient();
    const { error: upsertError } = await supabase.from("reflexiones").upsert(
      {
        estudiante_id: estudianteId,
        actividad_id: actividadId,
        momento: "prediccion",
        texto: null,
        confianza,
      },
      { onConflict: "estudiante_id,actividad_id,momento" },
    );

    if (upsertError) {
      setError(mensajeError(upsertError));
      setCargando(false);
      return;
    }

    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 dark:border-indigo-900 dark:bg-indigo-950/40"
    >
      <div className="flex items-center gap-2">
        <Target className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
          ¿Qué tan seguro estás de que vas a resolver bien esta actividad?
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setConfianza(n)}
              aria-pressed={confianza === n}
              aria-label={`${n} de 5`}
              className={`flex h-8 flex-1 items-center justify-center rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                confianza === n
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-500 hover:bg-indigo-100 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-indigo-950"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>Poco seguro</span>
          <span>Muy seguro</span>
        </div>
      </div>
      {error && <ErrorText>{error}</ErrorText>}
      <Boton type="submit" size="sm" disabled={confianza === null} cargando={cargando} className="self-start">
        {cargando ? "Guardando..." : "Empezar la actividad"}
      </Boton>
    </form>
  );
}
