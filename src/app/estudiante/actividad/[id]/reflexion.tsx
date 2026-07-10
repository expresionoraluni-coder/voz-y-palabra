"use client";

import { useState } from "react";
import { Lightbulb, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Textarea, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

export default function Reflexion({
  actividadId,
  estudianteId,
  textoPrevio,
}: {
  actividadId: string;
  estudianteId: string;
  textoPrevio?: string;
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
        texto,
      },
      { onConflict: "estudiante_id,actividad_id" },
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
          Antes de seguir: ¿qué fue lo más difícil de este ejercicio?
        </p>
      </div>
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={2}
        placeholder="Escribe una idea breve"
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
