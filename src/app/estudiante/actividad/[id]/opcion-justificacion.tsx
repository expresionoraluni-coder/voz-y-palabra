"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function OpcionJustificacion({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: { pregunta: string; opciones: string[] };
  respuestaPrevia?: { opcion: string; justificacion: string };
}) {
  const router = useRouter();
  const [opcion, setOpcion] = useState(respuestaPrevia?.opcion ?? "");
  const [justificacion, setJustificacion] = useState(
    respuestaPrevia?.justificacion ?? "",
  );
  const [cargando, setCargando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        respuesta: { opcion, justificacion },
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
      <p className="font-medium text-zinc-900 dark:text-zinc-50">
        {contenido.pregunta}
      </p>
      <div className="flex flex-col gap-2">
        {contenido.opciones.map((op) => (
          <label
            key={op}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 dark:border-zinc-800"
          >
            <input
              type="radio"
              name="opcion"
              value={op}
              checked={opcion === op}
              onChange={() => setOpcion(op)}
              required
            />
            <span className="text-zinc-900 dark:text-zinc-50">{op}</span>
          </label>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm text-zinc-600 dark:text-zinc-400">
          ¿Por qué elegiste esa opción?
        </label>
        <textarea
          required
          value={justificacion}
          onChange={(e) => setJustificacion(e.target.value)}
          rows={3}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {guardado && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Guardado. Puedes cambiar tu respuesta cuando quieras.
        </p>
      )}
      <button
        type="submit"
        disabled={cargando}
        className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {cargando ? "Guardando..." : "Guardar mi respuesta"}
      </button>
    </form>
  );
}
