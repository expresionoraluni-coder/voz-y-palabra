"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ComentarioEntrega({
  entregaId,
  pendienteRevision,
}: {
  entregaId: string;
  pendienteRevision: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [comentario, setComentario] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    if (!comentario.trim()) return;
    setError(null);
    setCargando(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Tu sesión expiró.");
      setCargando(false);
      return;
    }

    const { error: comentarioError } = await supabase
      .from("retroalimentacion_docente")
      .insert({ entrega_id: entregaId, docente_id: user.id, comentario });
    if (comentarioError) {
      setError(comentarioError.message);
      setCargando(false);
      return;
    }

    if (pendienteRevision) {
      await supabase.from("entregas").update({ estado: "revisada" }).eq("id", entregaId);
    }

    setComentario("");
    setAbierto(false);
    setCargando(false);
    router.refresh();
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="mt-2 text-sm text-zinc-500 underline dark:text-zinc-400"
      >
        Comentar
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <textarea
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        rows={2}
        placeholder="Escribe un comentario para el estudiante"
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={enviar}
          disabled={cargando}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {cargando ? "Enviando..." : pendienteRevision ? "Comentar y marcar revisada" : "Comentar"}
        </button>
        <button onClick={() => setAbierto(false)} className="text-sm text-zinc-500 dark:text-zinc-400">
          Cancelar
        </button>
      </div>
    </div>
  );
}
