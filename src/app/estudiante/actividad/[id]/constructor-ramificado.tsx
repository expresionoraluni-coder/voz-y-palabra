"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Seccion = { nombre: string; guia: string };

export default function ConstructorRamificado({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: { tema_sugerido: string | null; secciones: Seccion[] };
  respuestaPrevia?: { tema: string; textos: string[] };
}) {
  const router = useRouter();
  const [tema, setTema] = useState(respuestaPrevia?.tema ?? "");
  const [textos, setTextos] = useState<string[]>(
    respuestaPrevia?.textos ?? contenido.secciones.map(() => ""),
  );
  const [cargando, setCargando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function actualizar(i: number, valor: string) {
    setTextos((prev) => prev.map((v, idx) => (idx === i ? valor : v)));
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
        respuesta: { tema, textos },
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
      {contenido.tema_sugerido && (
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          {contenido.tema_sugerido}
        </p>
      )}
      <div className="flex flex-col gap-1">
        <label className="text-sm text-zinc-600 dark:text-zinc-400">
          Tu tema
        </label>
        <input
          required
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      {contenido.secciones.map((s, i) => (
        <div key={i} className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {s.nombre}
          </label>
          {s.guia && (
            <p className="text-xs text-zinc-500 dark:text-zinc-500">{s.guia}</p>
          )}
          <textarea
            required
            value={textos[i] ?? ""}
            onChange={(e) => actualizar(i, e.target.value)}
            rows={4}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
      ))}

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
