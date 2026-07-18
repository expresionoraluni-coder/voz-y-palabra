"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, Lightbulb } from "lucide-react";
import { useEntregaActividad } from "@/hooks/useEntregaActividad";
import { Field, Label, Textarea, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import ProgressBar from "@/components/ui/progress-bar";
import { ideasClaveMencionadas } from "@/lib/ideas-clave";
import { contarPalabras } from "@/lib/contar-palabras";
import { bloquearPegado } from "@/lib/anti-copiar";
import {
  type ContenidoOpcionJustificacion,
  type RondaRespuesta,
  rondasDeContenido,
  introDeContenido,
  rondasDeRespuesta,
} from "@/lib/opcion-justificacion";

export default function OpcionJustificacion({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: ContenidoOpcionJustificacion;
  respuestaPrevia?: Record<string, unknown>;
}) {
  const { cargando, guardado, error, setError, guardar, marcarSinGuardar } = useEntregaActividad(actividadId, estudianteId);

  const rondas = useMemo(() => rondasDeContenido(contenido), [contenido]);
  const intro = introDeContenido(contenido);
  const rondasPrevias = useMemo(() => rondasDeRespuesta(respuestaPrevia), [respuestaPrevia]);

  const [indiceActual, setIndiceActual] = useState(0);
  const [respuestas, setRespuestas] = useState<RondaRespuesta[]>(() =>
    rondas.map((_, i) => rondasPrevias[i] ?? { opcion: "", justificacion: "" }),
  );

  const yaEnviado = guardado || rondasPrevias.length > 0;
  const ronda = rondas[indiceActual];
  const respuesta = respuestas[indiceActual];
  const esUltima = indiceActual === rondas.length - 1;

  const ideasMencionadas = useMemo(
    () => ideasClaveMencionadas(respuesta.justificacion, ronda.ideas_clave ?? []),
    [respuesta.justificacion, ronda.ideas_clave],
  );

  function actualizarRespuesta(cambios: Partial<RondaRespuesta>) {
    setRespuestas((prev) => prev.map((r, i) => (i === indiceActual ? { ...r, ...cambios } : r)));
    marcarSinGuardar();
  }

  function validarActual(): boolean {
    if (contarPalabras(respuesta.justificacion) < 6) {
      setError("Explica un poco más tu razonamiento antes de continuar.");
      return false;
    }
    setError(null);
    return true;
  }

  function irASiguiente() {
    if (!validarActual()) return;
    setIndiceActual((i) => i + 1);
  }

  function irAAnterior() {
    setError(null);
    setIndiceActual((i) => i - 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validarActual()) return;
    await guardar({ respuesta: { rondas: respuestas }, estado: "pendiente_revision" });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {intro && indiceActual === 0 && (
        <p className="rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
          {intro}
        </p>
      )}

      {rondas.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Pregunta {indiceActual + 1} de {rondas.length}
          </p>
          <ProgressBar
            porcentaje={((indiceActual + 1) / rondas.length) * 100}
            etiqueta="Progreso de la actividad"
          />
        </div>
      )}

      {ronda.contexto && (
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
          {ronda.contexto}
        </p>
      )}

      <fieldset className="flex flex-col gap-3">
        <legend className="font-medium text-slate-900 dark:text-slate-50">{ronda.pregunta}</legend>
        <div className="flex flex-col gap-2">
          {ronda.opciones.map((op) => {
            const seleccionada = respuesta.opcion === op;
            return (
              <label
                key={op}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                  seleccionada
                    ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/50"
                    : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                }`}
              >
                <input
                  type="radio"
                  name={`opcion-${indiceActual}`}
                  value={op}
                  checked={seleccionada}
                  onChange={() => actualizarRespuesta({ opcion: op })}
                  required
                  className="sr-only"
                />
                <span
                  className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    seleccionada
                      ? "border-indigo-600 bg-indigo-600"
                      : "border-slate-300 dark:border-slate-600"
                  }`}
                >
                  {seleccionada && <Check className="size-2.5 text-white" strokeWidth={3} aria-hidden="true" />}
                </span>
                <span className="text-sm text-slate-900 dark:text-slate-50">{op}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <Field>
        <Label htmlFor="justificacion">¿Por qué elegiste esa opción?</Label>
        <Textarea
          id="justificacion"
          required
          value={respuesta.justificacion}
          onChange={(e) => actualizarRespuesta({ justificacion: e.target.value })}
          onPaste={bloquearPegado}
          rows={3}
        />
      </Field>

      {ronda.ideas_clave && ronda.ideas_clave.length > 0 && !yaEnviado && contarPalabras(respuesta.justificacion) >= 4 && (
        <p className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-500">
          <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-indigo-500" aria-hidden="true" />
          {ideasMencionadas.length === 0
            ? "Aún no mencionas ninguna de las ideas que esperábamos en tu justificación — ¿qué más notaste?"
            : `Mencionas ${ideasMencionadas.length} de ${ronda.ideas_clave.length} ideas que esperábamos.`}
        </p>
      )}

      {ronda.ideas_clave && ronda.ideas_clave.length > 0 && yaEnviado && (
        <div className="flex flex-col gap-1 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
            <Lightbulb className="size-3.5 shrink-0 text-indigo-500" aria-hidden="true" />
            Ideas que esperábamos en tu justificación:
          </p>
          <ul className="flex flex-col gap-0.5">
            {ronda.ideas_clave.map((idea) => {
              const mencionada = ideasClaveMencionadas(respuesta.justificacion, [idea]).length > 0;
              return (
                <li
                  key={idea}
                  className={`flex items-center gap-1.5 text-xs ${
                    mencionada
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-500 dark:text-slate-500"
                  }`}
                >
                  {mencionada && <Check className="size-3 shrink-0" aria-hidden="true" />}
                  {idea}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {error && <ErrorText>{error}</ErrorText>}
      {guardado && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Guardado. Puedes cambiar tus respuestas cuando quieras.
        </p>
      )}

      <div className="flex items-center gap-2">
        {indiceActual > 0 && (
          <Boton type="button" variant="secondary" onClick={irAAnterior}>
            <ChevronLeft className="size-4" aria-hidden="true" />
            Atrás
          </Boton>
        )}
        {esUltima ? (
          <Boton type="submit" cargando={cargando}>
            {cargando ? "Guardando..." : "Guardar mis respuestas"}
          </Boton>
        ) : (
          <Boton type="button" onClick={irASiguiente}>
            Siguiente
          </Boton>
        )}
      </div>
    </form>
  );
}
