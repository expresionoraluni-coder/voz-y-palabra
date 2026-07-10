"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
      className="flex flex-col gap-2 rounded-lg bg-zinc-100 px-4 py-3 dark:bg-zinc-900"
    >
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
        Antes de seguir: ¿qué fue lo más difícil de este ejercicio?
      </p>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={2}
        placeholder="Escribe una idea breve"
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {guardado && (
        <p className="text-sm text-green-600 dark:text-green-400">Guardado.</p>
      )}
      <button
        type="submit"
        disabled={cargando || !texto.trim()}
        className="self-start rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-50"
      >
        {cargando ? "Guardando..." : "Guardar reflexión"}
      </button>
    </form>
  );
}
