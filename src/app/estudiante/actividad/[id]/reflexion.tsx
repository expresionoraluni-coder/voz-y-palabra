"use client";

import { useState } from "react";
import { Lightbulb, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Textarea, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

function mensajeCalibracion(confianza: number, puntajeAuto: number): string {
  const confianzaPct = (confianza - 1) * 25;
  const diferencia = confianzaPct - puntajeAuto;
  if (diferencia > 25) {
    return `Te sentías muy seguro (${confianza}/5) pero acertaste ${puntajeAuto}% — antes de confiar tanto, vale la pena repasar de nuevo.`;
  }
  if (diferencia < -25) {
    return `Te sentías poco seguro (${confianza}/5) y acertaste ${puntajeAuto}% — sabes más de lo que crees.`;
  }
  return `Tu confianza (${confianza}/5) estuvo bien calibrada con tu resultado (${puntajeAuto}%).`;
}

export default function Reflexion({
  actividadId,
  estudianteId,
  textoPrevio,
  prediccionTexto,
  confianzaPrevia,
  puntajeAuto,
}: {
  actividadId: string;
  estudianteId: string;
  textoPrevio?: string;
  prediccionTexto?: string;
  confianzaPrevia?: number | null;
  puntajeAuto?: number | null;
}) {
  const [texto, setTexto] = useState(textoPrevio ?? "");
  const [cargando, setCargando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardado(false);
    setCargando(true);

    const supabase = createClient();
    const { error: upsertError } = await supabase.from("reflexiones").upsert(
      {
        estudiante_id: estudianteId,
        actividad_id: actividadId,
        momento: "cierre",
        texto,
      },
      { onConflict: "estudiante_id,actividad_id,momento" },
    );

    if (upsertError) {
      setError(upsertError.message);
      setCargando(false);
      return;
    }

    setGuardado(true);
    setCargando(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 dark:border-indigo-900 dark:bg-indigo-950/40"
    >
      <div className="flex items-center gap-2">
        <Lightbulb className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
          {prediccionTexto
            ? "Antes de seguir: ¿qué tan cierta fue tu predicción?"
            : "Antes de seguir: ¿qué fue lo más difícil de este ejercicio?"}
        </p>
      </div>
      {prediccionTexto && (
        <p className="rounded-lg bg-white px-3 py-2 text-sm italic text-slate-600 dark:bg-slate-950 dark:text-slate-400">
          Dijiste que te costaría: "{prediccionTexto}"
        </p>
      )}
      {confianzaPrevia != null && puntajeAuto != null && (
        <p className="rounded-lg bg-white px-3 py-2 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-400">
          {mensajeCalibracion(confianzaPrevia, puntajeAuto)}
        </p>
      )}
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={2}
        placeholder={
          prediccionTexto
            ? "¿Fue así? ¿Qué harías diferente la próxima vez?"
            : "Escribe una idea breve"
        }
        className="bg-white dark:bg-slate-950"
      />
      {error && <ErrorText>{error}</ErrorText>}
      {guardado && (
        <p className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
          <Check className="size-3.5" aria-hidden="true" />
          Guardado
        </p>
      )}
      <Boton
        type="submit"
        variant="secondary"
        size="sm"
        disabled={!texto.trim()}
        cargando={cargando}
        className="self-start"
      >
        {cargando ? "Guardando..." : "Guardar reflexión"}
      </Boton>
    </form>
  );
}
