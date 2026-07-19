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
  type MensajeChat,
  type RondaContenido,
  type RondaRespuesta,
  rondasDeContenido,
  introDeContenido,
  presentacionDeContenido,
  mensajesDeContenido,
  rondasDeRespuesta,
} from "@/lib/opcion-justificacion";

function HiloChat({ mensajes }: { mensajes: MensajeChat[] }) {
  if (mensajes.length === 0) return null;

  const remitentes: string[] = [];
  mensajes.forEach((m) => {
    if (!remitentes.includes(m.de)) remitentes.push(m.de);
  });

  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-slate-100 p-3.5 dark:bg-slate-800/60">
      {mensajes.map((m, i) => {
        const derecha = remitentes.indexOf(m.de) === 1;
        return (
          <div key={i} className="flex flex-col gap-1.5">
            {m.nota && (
              <p className="self-center rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                {m.nota}
              </p>
            )}
            <div className={`flex ${derecha ? "justify-end" : "justify-start"}`}>
              <div
                className={`flex max-w-[80%] flex-col gap-0.5 rounded-2xl px-3.5 py-2 text-sm ${
                  derecha
                    ? "bg-emerald-500 text-white dark:bg-emerald-600"
                    : "bg-white text-slate-900 dark:bg-slate-700 dark:text-slate-50"
                }`}
              >
                <span className="text-[11px] font-semibold opacity-70">{m.de}</span>
                <span>{m.texto}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PreguntaRonda({
  ronda,
  respuesta,
  indice,
  onCambiar,
}: {
  ronda: RondaContenido;
  respuesta: RondaRespuesta;
  indice: number;
  onCambiar: (cambios: Partial<RondaRespuesta>) => void;
}) {
  const ideasMencionadas = useMemo(
    () => ideasClaveMencionadas(respuesta.justificacion, ronda.ideas_clave ?? []),
    [respuesta.justificacion, ronda.ideas_clave],
  );

  return (
    <div className="flex flex-col gap-4">
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
                  name={`opcion-${indice}`}
                  value={op}
                  checked={seleccionada}
                  onChange={() => onCambiar({ opcion: op })}
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
        <Label htmlFor={`justificacion-${indice}`}>¿Por qué elegiste esa opción?</Label>
        <Textarea
          id={`justificacion-${indice}`}
          required
          value={respuesta.justificacion}
          onChange={(e) => onCambiar({ justificacion: e.target.value })}
          onPaste={bloquearPegado}
          rows={3}
        />
      </Field>

      {ronda.ideas_clave && ronda.ideas_clave.length > 0 && (
        <div className="flex flex-col gap-1 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
            <Lightbulb className="size-3.5 shrink-0 text-indigo-500" aria-hidden="true" />
            Ideas que esperamos en tu justificación:
          </p>
          <ul className="flex flex-col gap-0.5">
            {ronda.ideas_clave.map((idea) => {
              const mencionada = ideasMencionadas.includes(idea);
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
    </div>
  );
}

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
  const presentacion = useMemo(() => presentacionDeContenido(contenido), [contenido]);
  const mensajes = useMemo(() => mensajesDeContenido(contenido), [contenido]);
  const rondasPrevias = useMemo(() => rondasDeRespuesta(respuestaPrevia), [respuestaPrevia]);

  const [indiceActual, setIndiceActual] = useState(0);
  const [respuestas, setRespuestas] = useState<RondaRespuesta[]>(() =>
    rondas.map((_, i) => rondasPrevias[i] ?? { opcion: "", justificacion: "" }),
  );

  const ronda = rondas[indiceActual];
  const respuesta = respuestas[indiceActual];
  const esUltima = indiceActual === rondas.length - 1;

  function actualizarRespuestaEn(indice: number, cambios: Partial<RondaRespuesta>) {
    setRespuestas((prev) => prev.map((r, i) => (i === indice ? { ...r, ...cambios } : r)));
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

  function validarTodas(): boolean {
    const faltante = respuestas.findIndex((r) => contarPalabras(r.justificacion) < 6);
    if (faltante !== -1) {
      setError(`Explica un poco más tu razonamiento en la pregunta ${faltante + 1} antes de guardar.`);
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
    if (presentacion === "todas_juntas" ? !validarTodas() : !validarActual()) return;
    await guardar({ respuesta: { rondas: respuestas }, estado: "pendiente_revision" });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {mensajes.length > 0 ? (
        presentacion === "todas_juntas" ? (
          <HiloChat mensajes={mensajes} />
        ) : (
          <HiloChat mensajes={mensajes.slice(0, ronda.mensajesVisibles ?? mensajes.length)} />
        )
      ) : (
        intro &&
        (presentacion === "todas_juntas" || indiceActual === 0) && (
          <p className="rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
            {intro}
          </p>
        )
      )}

      {presentacion === "todas_juntas" ? (
        <>
          {rondas.map((r, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              {rondas.length > 1 && (
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Pregunta {i + 1} de {rondas.length}
                </p>
              )}
              <PreguntaRonda
                ronda={r}
                respuesta={respuestas[i]}
                indice={i}
                onCambiar={(cambios) => actualizarRespuestaEn(i, cambios)}
              />
            </div>
          ))}

          {error && <ErrorText>{error}</ErrorText>}
          {guardado && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Guardado. Puedes cambiar tus respuestas cuando quieras.
            </p>
          )}

          <Boton type="submit" cargando={cargando}>
            {cargando ? "Guardando..." : "Guardar mis respuestas"}
          </Boton>
        </>
      ) : (
        <>
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

          <PreguntaRonda
            ronda={ronda}
            respuesta={respuesta}
            indice={indiceActual}
            onCambiar={(cambios) => actualizarRespuestaEn(indiceActual, cambios)}
          />

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
        </>
      )}
    </form>
  );
}
