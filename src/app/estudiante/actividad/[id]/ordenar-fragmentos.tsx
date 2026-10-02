"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2, GripVertical, Plus, Sparkles, X, XCircle } from "lucide-react";
import { useEntregaActividad } from "@/hooks/useEntregaActividad";
import PieEntregaAuto from "@/components/estudiante/pie-entrega-auto";
import { useIntentosAuto } from "@/hooks/useIntentosAuto";
import type { ContenidoOrdenarFragmentosPublico } from "@/lib/calificacion-ordenar-fragmentos";
import { calificarOrdenarFragmentos } from "./acciones-calificacion";

function FragmentoOrdenado({
  id,
  texto,
  indice,
  correcto,
  bloqueado,
  onQuitar,
}: {
  id: string;
  texto: string;
  indice: number;
  correcto: boolean | null;
  bloqueado: boolean;
  onQuitar: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: bloqueado,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 ${
        correcto === null
          ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          : correcto
            ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
            : "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
      }`}
    >
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        {indice + 1}
      </span>
      {!bloqueado && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Arrastrar para reordenar"
          className="mt-0.5 shrink-0 cursor-grab text-slate-400 hover:text-slate-600 active:cursor-grabbing dark:text-slate-400 dark:hover:text-slate-300"
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>
      )}
      <span className="flex-1 text-sm text-slate-900 dark:text-slate-50">{texto}</span>
      {bloqueado ? (
        correcto ? (
          <CheckCircle2
            className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
        ) : (
          <XCircle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
        )
      ) : (
        <button
          type="button"
          onClick={onQuitar}
          aria-label="Quitar de la secuencia"
          className="mt-0.5 shrink-0 text-slate-400 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </li>
  );
}

export default function OrdenarFragmentos({
  actividadId,
  contenido,
  respuestaPrevia,
  puntajeAuto,
}: {
  actividadId: string;
  contenido: ContenidoOrdenarFragmentosPublico;
  respuestaPrevia?: { orden: number[]; resultadoPorPosicion?: boolean[] };
  puntajeAuto?: number | null;
}) {
  const { cargando, error, setError, guardarConAccion, prepararReintento, entregaRegistrada } = useEntregaActividad(Boolean(respuestaPrevia));
  const { intentos, mejorPuntaje, registrarEntrega } = useIntentosAuto(
    respuestaPrevia,
    puntajeAuto ?? null,
    Boolean(respuestaPrevia),
  );

  const [secuencia, setSecuencia] = useState<number[]>(respuestaPrevia?.orden ?? []);
  // El detalle por posición ya se calificó en el servidor al entregar (ver
  // acciones-calificacion.ts) y se guardó junto a la respuesta — aquí solo
  // se lee, nunca se recalcula (la clave ya no llega al cliente). Entregas
  // Entregas históricas con un detalle de longitud incompatible no muestran
  // indicadores por fila, pero siguen bloqueadas por el intento ya guardado.
  const detallePrevio = respuestaPrevia?.resultadoPorPosicion;
  const [resultado, setResultado] = useState<boolean[] | null>(
    detallePrevio && detallePrevio.length === (respuestaPrevia?.orden.length ?? 0) ? detallePrevio : null,
  );
  const bloqueado = entregaRegistrada || resultado !== null;

  const disponibles = useMemo(
    () => contenido.fragmentos.map((_, i) => i).filter((i) => !secuencia.includes(i)),
    [contenido.fragmentos, secuencia],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function agregar(indice: number) {
    if (bloqueado) return;
    setSecuencia((prev) => [...prev, indice]);
  }

  function quitar(indice: number) {
    if (bloqueado) return;
    setSecuencia((prev) => prev.filter((i) => i !== indice));
  }

  function handleDragEnd(e: DragEndEvent) {
    if (bloqueado) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setSecuencia((prev) => {
      const oldIndex = prev.findIndex((i) => String(i) === active.id);
      const newIndex = prev.findIndex((i) => String(i) === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  const textoArmado = secuencia.map((i) => contenido.fragmentos[i]).join(" ");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (bloqueado) return;
    setError(null);

    if (secuencia.length === 0) {
      setError("Arma tu secuencia antes de guardar (elige los fragmentos que sí pertenecen y ordénalos).");
      return;
    }

    const guardada = await guardarConAccion(() => calificarOrdenarFragmentos(actividadId, secuencia));
    if (guardada) {
      setResultado(guardada.resultadoPorPosicion as boolean[]);
      registrarEntrega(guardada);
    }
  }

  function iniciarReintento() {
    prepararReintento();
    setError(null);
    setResultado(null);
    setSecuencia([]);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-[1.35rem] border border-cyan-200/80 bg-gradient-to-r from-cyan-50 via-white to-indigo-50 px-4 py-3.5 dark:border-cyan-900/70 dark:from-cyan-950/30 dark:via-slate-900 dark:to-indigo-950/25">
        <div aria-hidden="true" className="absolute -right-6 -top-8 size-24 rounded-full bg-cyan-200/55 blur-2xl dark:bg-cyan-700/20" />
        <div className="relative flex items-center justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.13em] text-cyan-700 dark:text-cyan-300"><Sparkles className="size-3.5" aria-hidden="true" /> Taller de secuencia</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">Elige los fragmentos, arma la idea y léela en voz baja.</p>
          </div>
          <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-cyan-700 shadow-sm dark:bg-slate-900/75 dark:text-cyan-200">{secuencia.length} en orden</span>
        </div>
      </div>
      {contenido.contexto && (
        <p className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
          {contenido.contexto}
        </p>
      )}

      {disponibles.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Fragmentos disponibles (toca para agregar a tu secuencia)
          </p>
          <div className="flex flex-wrap gap-2">
            {disponibles.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => agregar(i)}
                disabled={bloqueado}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-left text-sm text-slate-700 shadow-sm transition-[background-color,border-color,transform] hover:-translate-y-px hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/40"
              >
                <Plus className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                {contenido.fragmentos[i]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Tu secuencia {!bloqueado && "(arrastra para reordenar)"}
        </p>
        {secuencia.length === 0 ? (
          <p className="rounded-[1.2rem] border border-dashed border-indigo-200 bg-indigo-50/45 px-4 py-6 text-center text-sm text-indigo-700/70 dark:border-indigo-900/70 dark:bg-indigo-950/20 dark:text-indigo-300/70">
            Todavía no eliges ningún fragmento.
          </p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={secuencia.map(String)} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-2">
                {secuencia.map((indice, pos) => (
                  <FragmentoOrdenado
                    key={indice}
                    id={String(indice)}
                    texto={contenido.fragmentos[indice]}
                    indice={pos}
                    correcto={resultado ? (resultado[pos] ?? false) : null}
                    bloqueado={bloqueado}
                    onQuitar={() => quitar(indice)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {secuencia.length > 0 && (
        <div className="flex flex-col gap-1 rounded-[1.2rem] border border-indigo-100 bg-indigo-50 px-4 py-3 shadow-sm dark:border-indigo-900/70 dark:bg-indigo-950/40">
          <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
            Así se lee tu secuencia (léela y evalúa si fluye):
          </p>
          <p className="text-sm leading-relaxed text-indigo-900 dark:text-indigo-200">{textoArmado}</p>
        </div>
      )}

      <PieEntregaAuto error={error} bloqueado={bloqueado} cargando={cargando} puntaje={mejorPuntaje} intentos={intentos} onReintentar={iniciarReintento} textoBoton="Guardar mi secuencia" />
    </form>
  );
}
