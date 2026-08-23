"use client";

import { useMemo, useState } from "react";
import { Check, CheckCircle2, ChevronLeft, XCircle } from "lucide-react";
import { useEntregaActividad } from "@/hooks/useEntregaActividad";
import { Field, Label, Textarea, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import PieEntregaAuto from "@/components/estudiante/pie-entrega-auto";
import { useIntentosAuto } from "@/hooks/useIntentosAuto";
import ProgressBar from "@/components/ui/progress-bar";
import { bloquearPegado } from "@/lib/anti-copiar";
import { validarJustificacion } from "@/lib/validar-justificacion";
import {
  type ContenidoOpcionJustificacionPublico,
  type MensajeChat,
  type RondaContenidoPublica,
  type RondaRespuesta,
  rondasDeContenido,
  introDeContenido,
  presentacionDeContenido,
  mensajesDeContenido,
  rondasDeRespuesta,
} from "@/lib/opcion-justificacion";
import { calificarOpcionJustificacionAccion } from "./acciones-calificacion";

type ItemResultado = { correcta: boolean };

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
        const inicial = m.de.trim().charAt(0).toUpperCase();
        return (
          <div key={i} className="flex flex-col gap-1.5">
            {m.nota && (
              <p className="self-center rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                {m.nota}
              </p>
            )}
            <div className={`flex items-end gap-2 ${derecha ? "flex-row-reverse" : ""}`}>
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  derecha
                    ? "bg-emerald-600 text-white dark:bg-emerald-500"
                    : "bg-slate-400 text-white dark:bg-slate-600"
                }`}
                aria-hidden="true"
              >
                {inicial}
              </span>
              <div
                className={`flex max-w-[75%] flex-col gap-0.5 rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
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
  bloqueado,
  resultado,
}: {
  ronda: RondaContenidoPublica;
  respuesta: RondaRespuesta;
  indice: number;
  onCambiar: (cambios: Partial<RondaRespuesta>) => void;
  bloqueado: boolean;
  resultado?: ItemResultado;
}) {
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
            let estilo =
              "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50";
            if (bloqueado && seleccionada && resultado?.correcta) {
              estilo = "border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-950/40";
            } else if (bloqueado && seleccionada) {
              estilo = "border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-950/30";
            } else if (!bloqueado && seleccionada) {
              estilo = "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/50";
            }
            return (
              <label
                key={op}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${estilo} ${
                  bloqueado ? "cursor-default" : "cursor-pointer"
                }`}
              >
                <input
                  type="radio"
                  name={`opcion-${indice}`}
                  value={op}
                  checked={seleccionada}
                  onChange={() => onCambiar({ opcion: op })}
                  disabled={bloqueado}
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
                <span className="flex-1 text-sm text-slate-900 dark:text-slate-50">{op}</span>
                {bloqueado && seleccionada && resultado?.correcta && (
                  <CheckCircle2
                    className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  />
                )}
                {bloqueado && seleccionada && resultado && !resultado.correcta && (
                  <XCircle className="size-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
                )}
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
          disabled={bloqueado}
          value={respuesta.justificacion}
          onChange={(e) => onCambiar({ justificacion: e.target.value })}
          onPaste={bloquearPegado}
          rows={3}
        />
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Explica con tus palabras qué detalle de la situación te llevó a elegirla. No repitas solo la opción.
        </p>
      </Field>
    </div>
  );
}

export default function OpcionJustificacion({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
  puntajeAuto,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: ContenidoOpcionJustificacionPublico;
  respuestaPrevia?: Record<string, unknown>;
  puntajeAuto?: number | null;
}) {
  const { cargando, error, setError, guardarConAccion, prepararReintento, entregaRegistrada } = useEntregaActividad(actividadId, estudianteId, Boolean(respuestaPrevia));

  const rondas = useMemo(() => rondasDeContenido(contenido), [contenido]);
  const intro = introDeContenido(contenido);
  const presentacion = useMemo(() => presentacionDeContenido(contenido), [contenido]);
  const mensajes = useMemo(() => mensajesDeContenido(contenido), [contenido]);
  const rondasPrevias = useMemo(() => rondasDeRespuesta(respuestaPrevia), [respuestaPrevia]);
  const { intentos, mejorPuntaje, registrarEntrega } = useIntentosAuto(
    respuestaPrevia,
    puntajeAuto ?? null,
    Boolean(respuestaPrevia),
  );

  const [indiceActual, setIndiceActual] = useState(0);
  const [respuestas, setRespuestas] = useState<RondaRespuesta[]>(() =>
    rondas.map((_, i) => rondasPrevias[i] ?? { opcion: "", justificacion: "" }),
  );
  // El detalle de aciertos (con el texto de la opción correcta) ya se
  // calificó en el servidor al entregar (ver acciones-calificacion.ts) —
  // aquí solo se lee, nunca se recalcula. Entregas de antes de este cambio
  // sin `resultado` se tratan como si no hubiera entrega todavía.
  const [resultado, setResultado] = useState<ItemResultado[] | null>(
    (respuestaPrevia?.resultado as ItemResultado[] | undefined) ?? null,
  );
  const bloqueado = entregaRegistrada || resultado !== null;

  const ronda = rondas[indiceActual];
  const respuesta = respuestas[indiceActual];
  const esUltima = indiceActual === rondas.length - 1;

  function actualizarRespuestaEn(indice: number, cambios: Partial<RondaRespuesta>) {
    if (bloqueado) return;
    setRespuestas((prev) => prev.map((r, i) => (i === indice ? { ...r, ...cambios } : r)));
  }

  function validarActual(): boolean {
    const errorValidacion = validarJustificacion(respuesta.justificacion, respuesta.opcion);
    if (errorValidacion) {
      setError(errorValidacion);
      return false;
    }
    setError(null);
    return true;
  }

  function validarTodas(): boolean {
    const faltante = respuestas.findIndex((r) => validarJustificacion(r.justificacion, r.opcion));
    if (faltante !== -1) {
      setError(`Completa la explicación de la pregunta ${faltante + 1} antes de guardar.`);
      return false;
    }
    setError(null);
    return true;
  }

  function irASiguiente() {
    if (!bloqueado && !validarActual()) return;
    setIndiceActual((i) => i + 1);
  }

  function irAAnterior() {
    setError(null);
    setIndiceActual((i) => i - 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (bloqueado) return;
    if (presentacion === "todas_juntas" ? !validarTodas() : !validarActual()) return;

    const guardada = await guardarConAccion(() => calificarOpcionJustificacionAccion(actividadId, respuestas));
    if (guardada) {
      setResultado(guardada.resultado as ItemResultado[]);
      registrarEntrega(guardada);
    }
  }

  function iniciarReintento() {
    prepararReintento();
    setError(null);
    setResultado(null);
    setIndiceActual(0);
    setRespuestas(rondas.map(() => ({ opcion: "", justificacion: "" })));
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
                bloqueado={bloqueado}
                resultado={resultado?.[i]}
              />
            </div>
          ))}

          {error && <ErrorText>{error}</ErrorText>}

          {!bloqueado && (
            <Boton type="submit" cargando={cargando}>
              {cargando ? "Guardando..." : "Guardar mis respuestas"}
            </Boton>
          )}
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
            bloqueado={bloqueado}
            resultado={resultado?.[indiceActual]}
          />

          {error && <ErrorText>{error}</ErrorText>}

          <div className="flex items-center gap-2">
            {indiceActual > 0 && (
              <Boton type="button" variant="secondary" onClick={irAAnterior}>
                <ChevronLeft className="size-4" aria-hidden="true" />
                Atrás
              </Boton>
            )}
            {esUltima ? (
              !bloqueado && (
                <Boton type="submit" cargando={cargando}>
                  {cargando ? "Guardando..." : "Guardar mis respuestas"}
                </Boton>
              )
            ) : (
              <Boton type="button" onClick={irASiguiente}>
                Siguiente
              </Boton>
            )}
          </div>
        </>
      )}
      <PieEntregaAuto error={null} bloqueado={bloqueado} cargando={cargando} puntaje={mejorPuntaje} intentos={intentos} onReintentar={iniciarReintento} />
    </form>
  );
}
