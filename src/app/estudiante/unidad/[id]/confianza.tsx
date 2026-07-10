"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gauge } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

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
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <Gauge className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
          {momento === "inicio"
            ? "¿Qué tan seguro te sientes con este tema, antes de empezar?"
            : "Terminaste la unidad. ¿Qué tan seguro te sientes ahora?"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={valor}
          onChange={(e) => setValor(Number(e.target.value))}
          className="h-2 flex-1 cursor-pointer accent-indigo-600"
        />
        <span className="w-12 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">
          {valor}%
        </span>
      </div>
      {error && <ErrorText>{error}</ErrorText>}
      <Boton onClick={guardar} cargando={cargando} size="sm" className="self-start">
        {cargando ? "Guardando..." : "Continuar"}
      </Boton>
    </Card>
  );
}
