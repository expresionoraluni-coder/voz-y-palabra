"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCirclePlus, ThumbsUp, TrendingUp, LifeBuoy } from "lucide-react";
import { Textarea, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import { guardarOrientacionAccion } from "./acciones-apoyo";

type Evaluacion = "logrado" | "en_proceso" | "necesita_apoyo";

const OPCIONES_EVALUACION: { valor: Evaluacion; etiqueta: string; icon: typeof ThumbsUp; clase: string }[] = [
  {
    valor: "necesita_apoyo",
    etiqueta: "Requiere acompañamiento",
    icon: LifeBuoy,
    clase: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  },
  {
    valor: "en_proceso",
    etiqueta: "Conviene practicar",
    icon: TrendingUp,
    clase:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  },
  {
    valor: "logrado",
    etiqueta: "Puede continuar",
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

    const resultado = await guardarOrientacionAccion(entregaId, comentario, evaluacion, pendienteRevision);
    if (!resultado.ok) {
      setError(resultado.error);
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
        {actual ? `Editar orientación (${actual.etiqueta})` : "Añadir orientación"}
      </button>
    );
  }

  return (
    <div className="mt-2.5 flex flex-col gap-2.5 border-t border-slate-100 pt-3 dark:border-slate-800">
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Apoyo para continuar</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          No es una calificación: elige una señal y, si hace falta, deja una orientación breve.
        </p>
      </div>
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
        placeholder="Escribe una orientación breve para seguir avanzando (opcional)"
      />
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex gap-2">
        <Boton size="sm" onClick={enviar} cargando={cargando} disabled={!comentario.trim() && !evaluacion}>
          {cargando ? "Guardando..." : pendienteRevision ? "Guardar y marcar atendida" : "Guardar apoyo"}
        </Boton>
        <Boton size="sm" variant="ghost" onClick={() => setAbierto(false)}>
          Cancelar
        </Boton>
      </div>
    </div>
  );
}
