"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useEntregaActividad } from "@/hooks/useEntregaActividad";
import { Select, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import AvisoReintento from "@/components/estudiante/aviso-reintento";
import { useIntentosAuto } from "@/hooks/useIntentosAuto";
import { bloquearCopiar } from "@/lib/anti-copiar";
import type { ContenidoClasificacionPublico } from "@/lib/calificacion-clasificacion";
import { calificarClasificacionAccion } from "./acciones-calificacion";

type ItemSnapshot = { texto: string; correcta: string };

function mezclar<T>(arr: T[]): T[] {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export default function Clasificacion({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
  dosNiveles,
  puntajeAuto,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: ContenidoClasificacionPublico;
  respuestaPrevia?: { elegidas: string[]; itemsSnapshot?: ItemSnapshot[] };
  dosNiveles?: boolean;
  puntajeAuto?: number | null;
}) {
  const { cargando, error, setError, guardarConAccion } = useEntregaActividad(actividadId, estudianteId);
  const { intentos, mejorPuntaje, registrarEntrega } = useIntentosAuto(
    respuestaPrevia,
    puntajeAuto ?? null,
    Boolean(respuestaPrevia),
  );
  const [elegidas, setElegidas] = useState<string[]>(
    respuestaPrevia?.elegidas ?? contenido.elementos.map(() => ""),
  );
  // El detalle de aciertos/fallos ya se calificó en el servidor al entregar
  // (ver acciones-calificacion.ts) y se guardó junto a la respuesta
  // (itemsSnapshot, el mismo campo que ya usaba la matriz de confusión
  // docente) — aquí solo se lee, nunca se recalcula. Entregas de antes de
  // este cambio sin itemsSnapshot se tratan como si no hubiera entrega
  // todavía, en vez de tronar.
  const [resultado, setResultado] = useState<boolean[] | null>(
    respuestaPrevia?.itemsSnapshot
      ? respuestaPrevia.itemsSnapshot.map((item, i) => item.correcta === respuestaPrevia.elegidas[i])
      : null,
  );
  const bloqueado = resultado !== null;

  // En las actividades de "dos niveles" (una vez aprobadas, desbloquean su
  // nivel 2) el orden se revuelve una sola vez por carga de página — así no
  // se puede memorizar "la pregunta 3 siempre es X" entre intentos.
  const elementosOrden = useMemo(
    () => {
      const conIndice = contenido.elementos.map((el, i) => ({ ...el, indiceOriginal: i }));
      return dosNiveles ? mezclar(conIndice) : conIndice;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const categoriasOrden = useMemo(
    () => (dosNiveles ? mezclar(contenido.categorias) : contenido.categorias),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function actualizar(indice: number, valor: string) {
    if (bloqueado) return;
    setElegidas((prev) => prev.map((v, i) => (i === indice ? valor : v)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (bloqueado) return;
    setError(null);

    if (elegidas.some((v) => !v)) {
      setError("Clasifica todos los elementos antes de guardar.");
      return;
    }

    const guardada = await guardarConAccion(() => calificarClasificacionAccion(actividadId, elegidas));
    if (guardada) {
      const snapshot = guardada.itemsSnapshot as ItemSnapshot[];
      setResultado(snapshot.map((item, i) => item.correcta === elegidas[i]));
      registrarEntrega(guardada);
    }
  }

  function iniciarReintento() {
    setError(null);
    setResultado(null);
    setElegidas(contenido.elementos.map(() => ""));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {contenido.contexto && (
        <div
          onCopy={bloquearCopiar}
          onContextMenu={(e) => e.preventDefault()}
          className="select-none rounded-xl bg-slate-50 px-4 py-3.5 text-sm leading-relaxed text-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
        >
          {contenido.contexto}
        </div>
      )}
      {elementosOrden.map((el) => {
        const i = el.indiceOriginal;
        return (
          <div
            key={i}
            className="flex flex-col gap-2.5 rounded-xl border border-slate-200 px-4 py-3.5 dark:border-slate-800"
          >
            <p className="text-sm text-slate-900 dark:text-slate-50">{el.texto}</p>
            <Select value={elegidas[i]} disabled={bloqueado} onChange={(e) => actualizar(i, e.target.value)}>
              <option value="">Elige una categoría</option>
              {categoriasOrden.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            {resultado && (
              <p
                className={`flex items-center gap-1.5 text-sm ${
                  resultado[i]
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {resultado[i] ? (
                  <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                ) : (
                  <XCircle className="size-4 shrink-0" aria-hidden="true" />
                )}
                {resultado[i] ? "Correcto" : "Incorrecto; revisa tu elección"}
              </p>
            )}
          </div>
        );
      })}
      {error && <ErrorText>{error}</ErrorText>}
      {!bloqueado && (
        <Boton type="submit" cargando={cargando}>
          {cargando ? "Guardando..." : "Guardar y revisar"}
        </Boton>
      )}
      {bloqueado && (
        <AvisoReintento
          puntaje={mejorPuntaje}
          intentos={intentos}
          onReintentar={iniciarReintento}
          cargando={cargando}
        />
      )}
    </form>
  );
}
