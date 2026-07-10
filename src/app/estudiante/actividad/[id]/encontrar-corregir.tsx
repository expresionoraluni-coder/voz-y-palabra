"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EncontrarCorregir({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: { texto_original: string; pista: string | null };
  respuestaPrevia?: { que_encontraste: string; version_corregida: string };
}) {
  const router = useRouter();
  const [queEncontraste, setQueEncontraste] = useState(
    respuestaPrevia?.que_encontraste ?? "",
  );
  const [versionCorregida, setVersionCorregida] = useState(
    respuestaPrevia?.version_corregida ?? "",
  );
  const [mostrarPista, setMostrarPista] = useState(false);
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
        respuesta: {
          que_encontraste: queEncontraste,
          version_corregida: versionCorregida,
        },
        estado: "pendiente_revision",
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
      <div className="rounded-lg bg-zinc-100 px-4 py-3 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
        {contenido.texto_original}
      </div>

      {contenido.pista && !mostrarPista && (
        <button
          type="button"
          onClick={() => setMostrarPista(true)}
          className="self-start text-sm text-zinc-500 underline dark:text-zinc-400"
        >
          Mostrar pista
        </button>
      )}
      {contenido.pista && mostrarPista && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Pista: {contenido.pista}
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm text-zinc-600 dark:text-zinc-400">
          ¿Qué encontraste que está mal?
        </label>
        <textarea
          required
          value={queEncontraste}
          onChange={(e) => setQueEncontraste(e.target.value)}
          rows={2}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-zinc-600 dark:text-zinc-400">
          Tu versión corregida
        </label>
        <textarea
          required
          value={versionCorregida}
          onChange={(e) => setVersionCorregida(e.target.value)}
          rows={5}
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
