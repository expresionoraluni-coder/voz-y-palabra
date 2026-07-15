"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/mensaje-error";
import { ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import { similitudTexto } from "@/lib/similitud-texto";

function contarPalabras(texto: string) {
  return texto.trim().length === 0 ? 0 : texto.trim().split(/\s+/).length;
}

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

    for (const fila of celdas) {
      for (const celda of fila) {
        if (contarPalabras(celda) < 2) {
          setError("Completa todas las celdas con al menos unas palabras antes de guardar.");
          return;
        }
      }
    }

    for (let i = 0; i < celdas.length; i++) {
      for (let j = 0; j < celdas[i].length; j++) {
        for (let k = j + 1; k < celdas[i].length; k++) {
          if (similitudTexto(celdas[i][j], celdas[i][k]) > 0.8) {
            setError(
              `Tus respuestas para "${contenido.conceptos[j]}" y "${contenido.conceptos[k]}" en "${contenido.criterios[i]}" se parecen mucho — ¿hay una diferencia real ahí?`,
            );
            return;
          }
        }
      }
    }

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
      setError(mensajeError(upsertError));
      setCargando(false);
      return;
    }

    setGuardado(true);
    setCargando(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60">
              <th className="p-3 text-left"></th>
              {contenido.conceptos.map((c) => (
                <th
                  key={c}
                  className="border-l border-slate-200 p-3 text-left font-medium text-slate-900 dark:border-slate-800 dark:text-slate-50"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contenido.criterios.map((criterio, i) => (
              <tr key={criterio} className="border-t border-slate-200 dark:border-slate-800">
                <td className="w-1/4 p-3 align-top text-xs font-medium text-slate-500 dark:text-slate-500">
                  {criterio}
                </td>
                {contenido.conceptos.map((_, j) => (
                  <td key={j} className="border-l border-slate-200 p-1 dark:border-slate-800">
                    <textarea
                      value={celdas[i]?.[j] ?? ""}
                      onChange={(e) => actualizar(i, j, e.target.value)}
                      rows={2}
                      className="w-full resize-none rounded-lg border-0 bg-transparent p-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:text-slate-50"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <ErrorText>{error}</ErrorText>}
      {guardado && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Guardado. Puedes seguir completando la tabla cuando quieras.
        </p>
      )}
      <Boton type="submit" cargando={cargando} className="self-start">
        {cargando ? "Guardando..." : "Guardar mi comparación"}
      </Boton>
    </form>
  );
}
