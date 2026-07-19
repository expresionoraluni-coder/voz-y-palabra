"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircle2, GripVertical, XCircle } from "lucide-react";
import { useEntregaActividad } from "@/hooks/useEntregaActividad";
import { ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import { similitudTexto } from "@/lib/similitud-texto";
import { contarPalabras } from "@/lib/contar-palabras";
import { bloquearPegado } from "@/lib/anti-copiar";

function ChipArrastrable({
  chip,
  seleccionado,
  onClick,
}: {
  chip: string;
  seleccionado: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `chip:${chip}`,
  });
  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: 10 }
    : undefined;

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-left text-sm transition-colors ${
        isDragging ? "opacity-50" : ""
      } ${
        seleccionado
          ? "border-indigo-500 bg-indigo-50 text-indigo-900 dark:border-indigo-400 dark:bg-indigo-950/50 dark:text-indigo-100"
          : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/40"
      }`}
    >
      <GripVertical className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
      {chip}
    </button>
  );
}

function CeldaDestino({
  id,
  valor,
  correcto,
  bloqueado,
  onClick,
}: {
  id: string;
  valor: string;
  correcto: boolean | null;
  bloqueado: boolean;
  onClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: bloqueado });

  return (
    <td
      ref={setNodeRef}
      className={`border-l border-slate-200 p-1.5 align-top dark:border-slate-800 ${
        isOver ? "bg-indigo-50 dark:bg-indigo-950/40" : ""
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={bloqueado}
        className={`flex min-h-16 w-full flex-col items-start justify-center gap-1 rounded-lg border border-dashed p-2 text-left text-sm transition-colors ${
          !valor
            ? "border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-600"
            : correcto === null
              ? "border-indigo-200 bg-indigo-50/60 text-slate-900 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-slate-50"
              : correcto
                ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100"
                : "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100"
        }`}
      >
        {valor ? (
          <span className="flex w-full items-start justify-between gap-1.5">
            <span>{valor}</span>
            {bloqueado &&
              (correcto ? (
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
              ))}
          </span>
        ) : (
          "Suelta o toca un chip"
        )}
      </button>
    </td>
  );
}

export default function Comparador({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: {
    conceptos: string[];
    criterios: string[];
    banco_respuestas?: string[];
    celda_correcta?: string[][];
  };
  respuestaPrevia?: { celdas: string[][] };
}) {
  const { cargando, guardado, error, setError, guardar, marcarSinGuardar } = useEntregaActividad(actividadId, estudianteId);
  const modoChips = !!(contenido.banco_respuestas && contenido.celda_correcta);

  const vacio = () => contenido.criterios.map(() => contenido.conceptos.map(() => ""));
  const [celdas, setCeldas] = useState<string[][]>(respuestaPrevia?.celdas ?? vacio());
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [resultado, setResultado] = useState<boolean[][] | null>(
    respuestaPrevia && modoChips
      ? contenido.celda_correcta!.map((fila, i) => fila.map((correcta, j) => respuestaPrevia.celdas[i]?.[j] === correcta))
      : null,
  );
  const bloqueado = resultado !== null;

  const colocados = useMemo(() => new Set(celdas.flat().filter(Boolean)), [celdas]);
  const disponibles = useMemo(
    () => (contenido.banco_respuestas ?? []).filter((chip) => !colocados.has(chip)),
    [contenido.banco_respuestas, colocados],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  function colocar(fila: number, columna: number, chip: string | null) {
    if (bloqueado) return;
    setCeldas((prev) => prev.map((f, i) => (i === fila ? f.map((c, j) => (j === columna ? (chip ?? "") : c)) : f)));
    marcarSinGuardar();
  }

  function manejarClickChip(chip: string) {
    setSeleccionado((prev) => (prev === chip ? null : chip));
  }

  function manejarClickCelda(fila: number, columna: number) {
    if (bloqueado) return;
    const actual = celdas[fila][columna];
    if (seleccionado) {
      colocar(fila, columna, seleccionado);
      setSeleccionado(null);
    } else if (actual) {
      colocar(fila, columna, null);
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    if (bloqueado) return;
    const { active, over } = e;
    if (!over) return;
    const chip = String(active.id).replace(/^chip:/, "");
    const match = String(over.id).match(/^cell:(\d+):(\d+)$/);
    if (!match) return;
    colocar(parseInt(match[1], 10), parseInt(match[2], 10), chip);
    setSeleccionado(null);
  }

  function actualizarTexto(fila: number, columna: number, valor: string) {
    setCeldas((prev) => prev.map((f, i) => (i === fila ? f.map((c, j) => (j === columna ? valor : c)) : f)));
    marcarSinGuardar();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (bloqueado) return;
    setError(null);

    if (modoChips) {
      if (celdas.some((fila) => fila.some((v) => !v))) {
        setError("Completa todas las celdas antes de guardar.");
        return;
      }
      const resultadoCalc = contenido.celda_correcta!.map((fila, i) =>
        fila.map((correcta, j) => celdas[i][j] === correcta),
      );
      const total = resultadoCalc.flat().length;
      const aciertos = resultadoCalc.flat().filter(Boolean).length;
      const puntajeAuto = Math.round((aciertos / total) * 100);
      const ok = await guardar({ respuesta: { celdas }, estado: "completada", puntaje_auto: puntajeAuto });
      if (ok) setResultado(resultadoCalc);
      return;
    }

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
              `Tus respuestas para "${contenido.conceptos[j]}" y "${contenido.conceptos[k]}" en "${contenido.criterios[i]}" se parecen mucho (¿hay una diferencia real ahí?).`,
            );
            return;
          }
        }
      }
    }

    await guardar({ respuesta: { celdas }, estado: "pendiente_revision" });
  }

  const tabla = (
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
              <th
                scope="row"
                className="w-1/4 p-3 text-left align-top text-xs font-medium text-slate-500 dark:text-slate-500"
              >
                {criterio}
              </th>
              {contenido.conceptos.map((concepto, j) =>
                modoChips ? (
                  <CeldaDestino
                    key={j}
                    id={`cell:${i}:${j}`}
                    valor={celdas[i]?.[j] ?? ""}
                    correcto={resultado ? resultado[i][j] : null}
                    bloqueado={bloqueado}
                    onClick={() => manejarClickCelda(i, j)}
                  />
                ) : (
                  <td key={j} className="border-l border-slate-200 p-1 dark:border-slate-800">
                    <textarea
                      value={celdas[i]?.[j] ?? ""}
                      onChange={(e) => actualizarTexto(i, j, e.target.value)}
                      onPaste={bloquearPegado}
                      rows={2}
                      aria-label={`${criterio} (${concepto})`}
                      className="w-full resize-none rounded-lg border-0 bg-transparent p-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:text-slate-50"
                    />
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {modoChips && disponibles.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
            Respuestas disponibles (arrastra o toca, luego toca una celda)
          </p>
          <div className="flex flex-wrap gap-2">
            {disponibles.map((chip) => (
              <ChipArrastrable
                key={chip}
                chip={chip}
                seleccionado={seleccionado === chip}
                onClick={() => manejarClickChip(chip)}
              />
            ))}
          </div>
        </div>
      )}

      {modoChips ? (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {tabla}
        </DndContext>
      ) : (
        tabla
      )}

      {error && <ErrorText>{error}</ErrorText>}
      {guardado && !modoChips && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Guardado. Puedes seguir completando la tabla cuando quieras.
        </p>
      )}
      {!bloqueado && (
        <Boton type="submit" cargando={cargando} className="self-start">
          {cargando ? "Guardando..." : "Guardar mi comparación"}
        </Boton>
      )}
    </form>
  );
}
