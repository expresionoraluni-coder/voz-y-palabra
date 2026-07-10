"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Comparador({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: { conceptos: string[]; criterios: string[] };
  respuestaPrevia?: { celdas: string[][] };
}) {
  const router = useRouter();
  const vacio = () =>
    contenido.criterios.map(() => contenido.conceptos.map(() => ""));
  const [celdas, setCeldas] = useState<string[][]>(
    respuestaPrevia?.celdas ?? vacio(),
  );
  const [cargando, setCargando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function actualizar(fila: number, columna: number, valor: string) {
    setCeldas((prev) =>
      prev.map((f, i) =>
        i === fila ? f.map((c, j) => (j === columna ? valor : c)) : f,
      ),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardado(false);
    setCargando(true);

    const supabase = createClient();
    const { error: upsertError } = await supabase.from("entregas").upsert(
      {
        estudiante_id: estudianteId,
        actividad_id: actividadId,
        respuesta: { celdas },
        estado: "completada",
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
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-zinc-200 p-2 text-left dark:border-zinc-800"></th>
              {contenido.conceptos.map((c) => (
                <th
                  key={c}
                  className="border border-zinc-200 p-2 text-left font-medium text-zinc-900 dark:border-zinc-800 dark:text-zinc-50"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contenido.criterios.map((criterio, i) => (
              <tr key={criterio}>
                <td className="border border-zinc-200 p-2 align-top text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                  {criterio}
                </td>
                {contenido.conceptos.map((_, j) => (
                  <td key={j} className="border border-zinc-200 p-1 dark:border-zinc-800">
                    <textarea
                      value={celdas[i]?.[j] ?? ""}
                      onChange={(e) => actualizar(i, j, e.target.value)}
                      rows={2}
                      className="w-full resize-none rounded border-0 bg-transparent p-1 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:text-zinc-50"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {guardado && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Guardado. Puedes seguir completando la tabla cuando quieras.
        </p>
      )}
      <button
        type="submit"
        disabled={cargando}
        className="self-start rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {cargando ? "Guardando..." : "Guardar mi comparación"}
      </button>
    </form>
  );
}
