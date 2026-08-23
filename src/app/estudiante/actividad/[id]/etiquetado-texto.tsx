"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useEntregaActividad } from "@/hooks/useEntregaActividad";
import { Select } from "@/components/ui/field";
import PieEntregaAuto from "@/components/estudiante/pie-entrega-auto";
import { useIntentosAuto } from "@/hooks/useIntentosAuto";
import type { ContenidoEtiquetadoTextoPublico } from "@/lib/calificacion-etiquetado-texto";
import { calificarEtiquetadoTextoAccion } from "./acciones-calificacion";

export default function EtiquetadoTexto({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
  puntajeAuto,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: ContenidoEtiquetadoTextoPublico;
  respuestaPrevia?: { elegidas: string[]; resultado?: boolean[] };
  puntajeAuto?: number | null;
}) {
  const { cargando, error, setError, guardarConAccion, prepararReintento, entregaRegistrada } = useEntregaActividad(actividadId, estudianteId, Boolean(respuestaPrevia));
  const { intentos, mejorPuntaje, registrarEntrega } = useIntentosAuto(
    respuestaPrevia,
    puntajeAuto ?? null,
    Boolean(respuestaPrevia),
  );
  const [elegidas, setElegidas] = useState<string[]>(
    respuestaPrevia?.elegidas ?? contenido.fragmentos.map(() => ""),
  );
  const [resultado, setResultado] = useState<boolean[] | null>(respuestaPrevia?.resultado ?? null);
  const bloqueado = entregaRegistrada || resultado !== null;

  function actualizar(indice: number, valor: string) {
    if (bloqueado) return;
    setElegidas((prev) => prev.map((v, i) => (i === indice ? valor : v)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (bloqueado) return;
    setError(null);

    if (elegidas.some((v) => !v)) {
      setError("Etiqueta todos los fragmentos antes de guardar.");
      return;
    }

    const guardada = await guardarConAccion(() => calificarEtiquetadoTextoAccion(actividadId, elegidas));
    if (guardada) {
      setResultado(guardada.resultado as boolean[]);
      registrarEntrega(guardada);
    }
  }

  function iniciarReintento() {
    prepararReintento();
    setError(null);
    setResultado(null);
    setElegidas(contenido.fragmentos.map(() => ""));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {contenido.contexto && (
        <p className="text-sm text-slate-500 dark:text-slate-500">{contenido.contexto}</p>
      )}
      {contenido.en_linea ? (
        // Flujo de texto normal (nada de flex): así el navegador ajusta
        // línea por línea igual que un párrafo cualquiera. Con flexbox,
        // cada fragmento (a veces una oración larga) se centraba como
        // bloque contra el <select>, y el <select> terminaba flotando a
        // medio párrafo cuando el texto ocupaba más de una línea — el
        // "todo se desalinea" que reportó la usuaria.
        <p className="rounded-xl border border-slate-200 px-4 py-4 text-sm leading-[2.4] text-slate-900 dark:border-slate-800 dark:text-slate-50">
          {contenido.fragmentos.map((f, i) => (
            <span key={i}>
              {f.texto}{" "}
              <select
                aria-label={`Etiqueta para el fragmento ${i + 1}`}
                value={elegidas[i]}
                disabled={bloqueado}
                onChange={(e) => actualizar(i, e.target.value)}
                className={`mx-0.5 rounded-md border-b-2 px-1.5 py-0.5 align-middle text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-default disabled:opacity-100 ${
                  resultado
                    ? resultado[i]
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                    : "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300"
                }`}
              >
                <option value="">elige</option>
                {(f.opciones ?? contenido.etiquetas).map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
              {resultado && !resultado[i] && (
                <span className="ml-1 text-xs text-red-600 dark:text-red-400">
                  Revisa este fragmento
                </span>
              )}{" "}
            </span>
          ))}
        </p>
      ) : (
        contenido.fragmentos.map((f, i) => (
          <div
            key={i}
            className="flex flex-col gap-2.5 rounded-xl border border-slate-200 px-4 py-3.5 dark:border-slate-800"
          >
            <p className="text-sm italic text-slate-900 dark:text-slate-50">&ldquo;{f.texto}&rdquo;</p>
            <Select aria-label={`Etiqueta para el fragmento ${i + 1}`} value={elegidas[i]} disabled={bloqueado} onChange={(e) => actualizar(i, e.target.value)}>
              <option value="">Elige una etiqueta</option>
              {contenido.etiquetas.map((e) => (
                <option key={e} value={e}>
                  {e}
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
        ))
      )}
      <PieEntregaAuto error={error} bloqueado={bloqueado} cargando={cargando} puntaje={mejorPuntaje} intentos={intentos} onReintentar={iniciarReintento} />
    </form>
  );
}
