"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCirclePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Textarea, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

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
        className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
      >
        <MessageCirclePlus className="size-4" aria-hidden="true" />
        Comentar
      </button>
    );
  }

  return (
    <div className="mt-2.5 flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
      <Textarea
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        rows={2}
        placeholder="Escribe un comentario para el estudiante"
      />
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex gap-2">
        <Boton size="sm" onClick={enviar} cargando={cargando}>
          {cargando ? "Enviando..." : pendienteRevision ? "Comentar y marcar revisada" : "Comentar"}
        </Boton>
        <Boton size="sm" variant="ghost" onClick={() => setAbierto(false)}>
          Cancelar
        </Boton>
      </div>
    </div>
  );
}
