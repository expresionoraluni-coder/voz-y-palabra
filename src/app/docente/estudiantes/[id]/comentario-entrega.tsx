"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCirclePlus, ThumbsUp, TrendingUp, LifeBuoy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/mensaje-error";
import { Textarea, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

type Evaluacion = "logrado" | "en_proceso" | "necesita_apoyo";

const OPCIONES_EVALUACION: { valor: Evaluacion; etiqueta: string; icon: typeof ThumbsUp; clase: string }[] = [
  {
    valor: "necesita_apoyo",
    etiqueta: "Necesita apoyo",
    icon: LifeBuoy,
    clase: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  },
  {
    valor: "en_proceso",
    etiqueta: "En proceso",
    icon: TrendingUp,
    clase:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  },
  {
    valor: "logrado",
    etiqueta: "Logrado",
    icon: ThumbsUp,
    clase:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  },
];

export default function ComentarioEntrega({
  entregaId,
  pendienteRevision,
  evaluacionInicial,
}: {
  entregaId: string;
  pendienteRevision: boolean;
  evaluacionInicial?: Evaluacion | null;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [comentario, setComentario] = useState("");
  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(evaluacionInicial ?? null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    if (!comentario.trim() && !evaluacion) return;
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

    if (comentario.trim()) {
      const { error: comentarioError } = await supabase
        .from("retroalimentacion_docente")
        .insert({ entrega_id: entregaId, docente_id: user.id, comentario });
      if (comentarioError) {
        setError(mensajeError(comentarioError));
        setCargando(false);
        return;
      }
    }

    const cambios: Record<string, unknown> = { evaluacion_docente: evaluacion };
    if (pendienteRevision) cambios.estado = "revisada";
    const { error: entregaError } = await supabase.from("entregas").update(cambios).eq("id", entregaId);
    if (entregaError) {
      setError(mensajeError(entregaError));
      setCargando(false);
      return;
    }

    setComentario("");
    setAbierto(false);
    setCargando(false);
    router.refresh();
  }

  if (!abierto) {
    const actual = OPCIONES_EVALUACION.find((o) => o.valor === evaluacionInicial);
    return (
      <button
        onClick={() => setAbierto(true)}
        className="mt-2.5 flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
      >
        <MessageCirclePlus className="size-4" aria-hidden="true" />
        {actual ? `Editar evaluación (${actual.etiqueta})` : "Comentar o evaluar"}
      </button>
    );
  }

  return (
    <div className="mt-2.5 flex flex-col gap-2.5 border-t border-slate-100 pt-3 dark:border-slate-800">
      <div className="flex flex-wrap gap-1.5">
        {OPCIONES_EVALUACION.map((o) => {
          const Icono = o.icon;
          const seleccionada = evaluacion === o.valor;
          return (
            <button
              key={o.valor}
              type="button"
              onClick={() => setEvaluacion(seleccionada ? null : o.valor)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-opacity ${o.clase} ${
                seleccionada ? "" : "opacity-45 hover:opacity-80"
              }`}
            >
              <Icono className="size-3.5" aria-hidden="true" />
              {o.etiqueta}
            </button>
          );
        })}
      </div>
      <Textarea
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        rows={2}
        placeholder="Escribe un comentario para el estudiante (opcional)"
      />
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex gap-2">
        <Boton size="sm" onClick={enviar} cargando={cargando} disabled={!comentario.trim() && !evaluacion}>
          {cargando ? "Guardando..." : pendienteRevision ? "Guardar y marcar revisada" : "Guardar"}
        </Boton>
        <Boton size="sm" variant="ghost" onClick={() => setAbierto(false)}>
          Cancelar
        </Boton>
      </div>
    </div>
  );
}
