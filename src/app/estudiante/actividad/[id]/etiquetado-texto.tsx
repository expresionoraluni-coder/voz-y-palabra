"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useEntregaActividad } from "@/hooks/useEntregaActividad";
import { Select, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

type Fragmento = { texto: string; etiqueta_correcta: string; opciones?: string[] };

export default function EtiquetadoTexto({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: { contexto: string | null; etiquetas: string[]; fragmentos: Fragmento[]; en_linea?: boolean };
  respuestaPrevia?: { elegidas: string[] };
}) {
  const { cargando, error, setError, guardar } = useEntregaActividad(actividadId, estudianteId);
  const [elegidas, setElegidas] = useState<string[]>(
    respuestaPrevia?.elegidas ?? contenido.fragmentos.map(() => ""),
  );
  // Si ya había una entrega previa, se muestra directo como calificada — si
  // no, alguien podría ver "Era: X" y reenviar corregido para sacar 100%.
  const [resultado, setResultado] = useState<boolean[] | null>(
    respuestaPrevia
      ? contenido.fragmentos.map((f, i) => f.etiqueta_correcta === respuestaPrevia.elegidas[i])
      : null,
  );
  const bloqueado = resultado !== null;

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

    const aciertos = contenido.fragmentos.map((f, i) => f.etiqueta_correcta === elegidas[i]);
    const puntajeAuto = Math.round(
      (aciertos.filter(Boolean).length / contenido.fragmentos.length) * 100,
    );

    const ok = await guardar({
      respuesta: {
        elegidas,
        // Copia de texto+etiqueta correcta al momento de entregar: si la
        // docente edita la actividad después, la matriz de confusión del
        // grupo no debe desalinearse.
        itemsSnapshot: contenido.fragmentos.map((f) => ({ texto: f.texto, correcta: f.etiqueta_correcta })),
      },
      estado: "completada",
      puntaje_auto: puntajeAuto,
    });
    if (ok) setResultado(aciertos);
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
                <span className="ml-1 text-xs text-red-600 dark:text-red-400">(era: {f.etiqueta_correcta})</span>
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
            <Select value={elegidas[i]} disabled={bloqueado} onChange={(e) => actualizar(i, e.target.value)}>
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
                {resultado[i] ? "Correcto" : `Era: ${f.etiqueta_correcta}`}
              </p>
            )}
          </div>
        ))
      )}
      {error && <ErrorText>{error}</ErrorText>}
      {!bloqueado && (
        <Boton type="submit" cargando={cargando}>
          {cargando ? "Guardando..." : "Guardar y revisar"}
        </Boton>
      )}
    </form>
  );
}
