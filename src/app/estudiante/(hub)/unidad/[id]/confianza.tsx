"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gauge, Minus, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/mensaje-error";
import { Card } from "@/components/ui/card";
import { ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

export default function Confianza({
  estudianteId,
  unidadId,
}: {
  estudianteId: string;
  unidadId: string;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(50);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setError(null);
    setCargando(true);
    const supabase = createClient();
    const { error: upsertError } = await supabase.from("autoevaluaciones_confianza").upsert(
      { estudiante_id: estudianteId, unidad_id: unidadId, momento: "inicio", valor },
      { onConflict: "estudiante_id,unidad_id,momento" },
    );
    if (upsertError) {
      setError(mensajeError(upsertError));
      setCargando(false);
      return;
    }
    setCargando(false);
    router.refresh();
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <Gauge className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
          Antes de empezar: ¿qué tan seguro estás de poder dominar esta unidad?
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setValor((v) => Math.max(0, v - 5))}
          disabled={valor <= 0}
          aria-label="Bajar 5%"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={valor}
          onChange={(e) => setValor(Number(e.target.value))}
          className="h-2 flex-1 cursor-pointer accent-indigo-600"
        />
        <button
          type="button"
          onClick={() => setValor((v) => Math.min(100, v + 5))}
          disabled={valor >= 100}
          aria-label="Subir 5%"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
        <span className="w-12 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
          {valor}%
        </span>
      </div>
      {error && <ErrorText>{error}</ErrorText>}
      <Boton onClick={guardar} cargando={cargando} size="sm" className="self-start">
        {cargando ? "Guardando..." : "Guardar"}
      </Boton>
    </Card>
  );
}
