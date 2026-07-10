"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Elemento = { texto: string; categoria_correcta: string };

export default function Clasificacion({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: { categorias: string[]; elementos: Elemento[] };
  respuestaPrevia?: { elegidas: string[] };
}) {
  const router = useRouter();
  const [elegidas, setElegidas] = useState<string[]>(
    respuestaPrevia?.elegidas ?? contenido.elementos.map(() => ""),
  );
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<boolean[] | null>(null);

  function actualizar(indice: number, valor: string) {
    setElegidas((prev) => prev.map((v, i) => (i === indice ? valor : v)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (elegidas.some((v) => !v)) {
      setError("Clasifica todos los elementos antes de guardar.");
      return;
    }

    setCargando(true);
    const supabase = createClient();
    const { error: upsertError } = await supabase.from("entregas").upsert(
      {
        estudiante_id: estudianteId,
        actividad_id: actividadId,
        respuesta: { elegidas },
        estado: "completada",
      },
      { onConflict: "estudiante_id,actividad_id" },
    );

    if (upsertError) {
      setError(upsertError.message);
      setCargando(false);
      return;
    }

    setResultado(
      contenido.elementos.map((el, i) => el.categoria_correcta === elegidas[i]),
    );
    setCargando(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {contenido.elementos.map((el, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
        >
          <p className="text-zinc-900 dark:text-zinc-50">{el.texto}</p>
          <select
            value={elegidas[i]}
            onChange={(e) => actualizar(i, e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">Elige una categoría</option>
            {contenido.categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {resultado && (
            <p
              className={
                resultado[i]
                  ? "text-sm text-green-600 dark:text-green-400"
                  : "text-sm text-red-600 dark:text-red-400"
              }
            >
              {resultado[i] ? "✓ Correcto" : `✗ Era: ${el.categoria_correcta}`}
            </p>
          )}
        </div>
      ))}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={cargando}
        className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {cargando ? "Guardando..." : "Guardar y revisar"}
      </button>
    </form>
  );
}
