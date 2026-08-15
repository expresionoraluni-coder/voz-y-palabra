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
  momento = "inicio",
  valorPrevio = null,
  onGuardado,
}: {
  estudianteId: string;
  unidadId: string;
  momento?: "inicio" | "cierre";
  valorPrevio?: number | null;
  onGuardado?: () => void;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(valorPrevio ?? 50);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esCierre = momento === "cierre";
  const titulo = esCierre
    ? "Al terminar: ¿qué tanta seguridad tienes sobre lo que aprendiste?"
    : "Antes de empezar: ¿qué tanta seguridad tienes para dominar esta unidad?";
  const ariaLabel = esCierre
    ? "Qué tanta seguridad tienes al terminar la unidad"
    : "Qué tanta seguridad tienes de dominar esta unidad";

  async function guardar() {
    if (cargando) return;
    setError(null);
    setCargando(true);
    const supabase = createClient();
    try {
      const { error: upsertError } = await supabase.from("autoevaluaciones_confianza").upsert(
        { estudiante_id: estudianteId, unidad_id: unidadId, momento, valor },
        { onConflict: "estudiante_id,unidad_id,momento" },
      );
      if (upsertError) {
        setError(mensajeError(upsertError));
        return;
      }
      if (esCierre) {
        try {
          await supabase.rpc("verificar_insignias");
        } catch {
          // El guardado no depende de actualizar la insignia en este instante.
        }
      }
      onGuardado?.();
      router.refresh();
    } catch {
      setError("No pudimos guardar tu nivel de seguridad. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  if (esCierre && valorPrevio !== null) {
    return (
      <Card className="flex flex-col gap-2.5 border-emerald-100 bg-emerald-50/60 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
        <div className="flex items-center gap-2">
          <Gauge className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Tu seguridad al terminar</p>
        </div>
        <p className="text-2xl font-semibold text-emerald-700 dark:text-emerald-300">{valorPrevio}%</p>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Esta respuesta quedó guardada como parte de tu cierre.
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <Gauge className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{titulo}</p>
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
          aria-label={ariaLabel}
          aria-valuetext={`${valor} por ciento`}
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
        <span className="w-12 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">{valor}%</span>
      </div>
      {error && <ErrorText>{error}</ErrorText>}
      <Boton onClick={guardar} cargando={cargando} size="sm" className="self-start">
        {cargando ? "Guardando..." : esCierre ? "Guardar nivel" : "Guardar"}
      </Boton>
    </Card>
  );
}
