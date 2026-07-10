"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function contarPalabras(texto: string) {
  return texto.trim().length === 0 ? 0 : texto.trim().split(/\s+/).length;
}

export default function RedaccionChecklist({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: { texto_fuente: string | null; limite_palabras: number; checklist: string[] };
  respuestaPrevia?: { texto: string; checklist_marcado: boolean[] };
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(respuestaPrevia?.texto ?? "");
  const [marcado, setMarcado] = useState<boolean[]>(
    respuestaPrevia?.checklist_marcado ?? contenido.checklist.map(() => false),
  );
  const [cargando, setCargando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const palabras = contarPalabras(texto);
  const excedido = palabras > contenido.limite_palabras;

  function alternar(i: number) {
    setMarcado((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
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
        respuesta: { texto, checklist_marcado: marcado },
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
      {contenido.texto_fuente && (
        <div className="max-h-40 overflow-auto rounded-lg bg-zinc-100 px-4 py-3 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {contenido.texto_fuente}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={6}
          placeholder="Escribe aquí"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <p
          className={
            excedido
              ? "self-end text-sm text-red-600 dark:text-red-400"
              : "self-end text-sm text-zinc-500 dark:text-zinc-500"
          }
        >
          {palabras} / {contenido.limite_palabras} palabras
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Antes de entregar, revisa
        </p>
        {contenido.checklist.map((punto, i) => (
          <label key={i} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" checked={marcado[i]} onChange={() => alternar(i)} />
            {punto}
          </label>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {guardado && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Guardado. Puedes seguir puliendo tu texto cuando quieras.
        </p>
      )}
      <button
        type="submit"
        disabled={cargando}
        className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {cargando ? "Guardando..." : "Guardar mi texto"}
      </button>
    </form>
  );
}
