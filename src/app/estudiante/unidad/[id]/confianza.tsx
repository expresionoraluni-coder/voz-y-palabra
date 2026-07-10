"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Confianza({
  estudianteId,
  unidadId,
  momento,
}: {
  estudianteId: string;
  unidadId: string;
  momento: "inicio" | "cierre";
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
      { estudiante_id: estudianteId, unidad_id: unidadId, momento, valor },
      { onConflict: "estudiante_id,unidad_id,momento" },
    );
    if (upsertError) {
      setError(upsertError.message);
      setCargando(false);
      return;
    }
    setCargando(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
        {momento === "inicio"
          ? "¿Qué tan seguro te sientes con este tema, antes de empezar?"
          : "Terminaste la unidad. ¿Qué tan seguro te sientes ahora?"}
      </p>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={valor}
          onChange={(e) => setValor(Number(e.target.value))}
          className="flex-1"
        />
        <span className="w-10 text-right text-sm text-zinc-600 dark:text-zinc-400">
          {valor}%
        </span>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        onClick={guardar}
        disabled={cargando}
        className="self-start rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {cargando ? "Guardando..." : "Continuar"}
      </button>
    </div>
  );
}
