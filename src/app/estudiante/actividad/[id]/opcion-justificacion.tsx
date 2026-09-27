"use client";

import { useMemo, useState } from "react";
import { Check, CheckCircle2, ChevronLeft, MessageCircleMore, Phone, XCircle } from "lucide-react";
import { useEntregaActividad } from "@/hooks/useEntregaActividad";
import { useBorradorLocal } from "@/hooks/use-borrador-local";
import { Field, Label, Textarea, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import PieEntregaAuto from "@/components/estudiante/pie-entrega-auto";
import { useIntentosAuto } from "@/hooks/useIntentosAuto";
import ProgressBar from "@/components/ui/progress-bar";
import { bloquearPegado } from "@/lib/anti-copiar";
import { contarPalabrasJustificacion, validarJustificacion } from "@/lib/validar-justificacion";
import { registrarDiagnosticoDeEntrega } from "@/lib/diagnostico-entrega-cliente";
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

type BorradorOpcionJustificacion = {
  indiceActual: number;
  respuestas: RondaRespuesta[];
};

function esBorradorOpcionJustificacion(
  valor: BorradorOpcionJustificacion | null,
  totalRondas: number,
): valor is BorradorOpcionJustificacion {
  return Boolean(
    valor &&
      Array.isArray(valor.respuestas) &&
      valor.respuestas.length === totalRondas &&
      valor.respuestas.every(
        (respuesta) => typeof respuesta?.opcion === "string" && typeof respuesta?.justificacion === "string",
      ),
  );
}

function HiloChat({ mensajes }: { mensajes: MensajeChat[] }) {
  if (mensajes.length === 0) return null;

  const remitentes: string[] = [];
  mensajes.forEach((m) => {
    if (!remitentes.includes(m.de)) remitentes.push(m.de);
  });

  return (
    <section
      aria-label="Conversación de la actividad"
      className="relative overflow-hidden rounded-[1.65rem] border border-slate-200/90 bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 p-3.5 shadow-inner dark:border-slate-700/90 dark:from-slate-900 dark:via-slate-800/80 dark:to-slate-900"
    >
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-indigo-500/10 via-violet-400/5 to-transparent" />
      <div className="relative mb-3 flex items-center gap-2.5 rounded-2xl border border-white/70 bg-white/65 px-3 py-2 shadow-sm backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/70">
        <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm">
          <Phone className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-900 dark:text-slate-50">Conversación en curso</p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Observa cómo cambia el mensaje</p>
        </div>
        <MessageCircleMore className="size-4 text-indigo-400" aria-hidden="true" />
      </div>
      <div className="relative flex flex-col gap-2">
      {mensajes.map((m, i) => {
        const derecha = remitentes.indexOf(m.de) === 1;
        const inicial = m.de.trim().charAt(0).toUpperCase();
        return (
          <div key={`${m.de}-${i}`} className="animate-mensaje-chat flex flex-col gap-1.5" style={{ animationDelay: `${i * 70}ms` }}>
            {m.nota && (
              <p className="self-center rounded-full border border-white/80 bg-white/70 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                {m.nota}
              </p>
            )}
            <div className={`flex items-end gap-2 ${derecha ? "flex-row-reverse" : ""}`}>
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  derecha
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                    : "bg-gradient-to-br from-slate-500 to-slate-600 text-white"
                }`}
                aria-hidden="true"
              >
                {inicial}
              </span>
              <div
                className={`flex max-w-[75%] flex-col gap-0.5 rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                  derecha
                    ? "rounded-br-md bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-600/15 dark:from-emerald-500 dark:to-teal-600"
                    : "rounded-bl-md bg-white text-slate-900 dark:bg-slate-700 dark:text-slate-50"
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
    </section>
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
  const totalPalabras = contarPalabrasJustificacion(respuesta.justificacion);
  return (
    <div className="flex flex-col gap-4">
      {ronda.contexto && (
        <p className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm leading-relaxed text-slate-700 dark:border-slate-700/80 dark:bg-slate-800/60 dark:text-slate-300">
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
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-[border-color,background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 ${estilo} ${
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
          Explica con tus palabras qué detalle de la situación te llevó a elegirla. Necesitas al menos 8 palabras y 3 palabras propias; no repitas solo la opción.
        </p>
        <p aria-live="polite" className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {totalPalabras === 1 ? "1 palabra escrita" : `${totalPalabras} palabras escritas`} · mínimo 8
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
  const { cargando, error, setError, guardarConAccion, prepararReintento, entregaRegistrada } = useEntregaActividad(Boolean(respuestaPrevia));

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

  const { borrador, guardarBorrador, borrarBorrador } = useBorradorLocal<BorradorOpcionJustificacion>({
    estudianteId,
    tipo: "opcion-justificacion",
    recursoId: actividadId,
    habilitado: !respuestaPrevia,
  });
  const borradorInicial = esBorradorOpcionJustificacion(borrador, rondas.length) ? borrador : null;
  const [indiceActual, setIndiceActual] = useState(
    borradorInicial && Number.isInteger(borradorInicial.indiceActual) && borradorInicial.indiceActual >= 0 && borradorInicial.indiceActual < rondas.length
      ? borradorInicial.indiceActual
      : 0,
  );
  const [respuestas, setRespuestas] = useState<RondaRespuesta[]>(() =>
    borradorInicial ? borradorInicial.respuestas : rondas.map((_, i) => rondasPrevias[i] ?? { opcion: "", justificacion: "" }),
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
    setRespuestas((prev) => {
      const siguientes = prev.map((r, i) => (i === indice ? { ...r, ...cambios } : r));
      guardarBorrador({ indiceActual, respuestas: siguientes });
      return siguientes;
    });
  }

  function validarActual(): boolean {
    const errorValidacion = validarJustificacion(respuesta.justificacion, respuesta.opcion);
    if (errorValidacion) {
      registrarDiagnosticoDeEntrega(actividadId, "validacion_justificacion");
      setError(errorValidacion);
      return false;
    }
    setError(null);
    return true;
  }

  function validarTodas(): boolean {
    const faltante = respuestas.findIndex((r) => validarJustificacion(r.justificacion, r.opcion));
    if (faltante !== -1) {
      const explicacion = validarJustificacion(respuestas[faltante].justificacion, respuestas[faltante].opcion);
      registrarDiagnosticoDeEntrega(actividadId, "validacion_justificacion");
      setError(`Pregunta ${faltante + 1}: ${explicacion}`);
      window.requestAnimationFrame(() => document.getElementById(`justificacion-${faltante}`)?.focus());
      return false;
    }
    setError(null);
    return true;
  }

  function irASiguiente() {
    if (!bloqueado && !validarActual()) return;
    setIndiceActual((i) => {
      const siguiente = i + 1;
      guardarBorrador({ indiceActual: siguiente, respuestas });
      return siguiente;
    });
  }

  function irAAnterior() {
    setError(null);
    setIndiceActual((i) => {
      const anterior = i - 1;
      guardarBorrador({ indiceActual: anterior, respuestas });
      return anterior;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (bloqueado) return;
    if (presentacion === "todas_juntas" ? !validarTodas() : !validarActual()) return;

    const guardada = await guardarConAccion(() => calificarOpcionJustificacionAccion(actividadId, respuestas));
    if (guardada) {
      setResultado(guardada.resultado as ItemResultado[]);
      registrarEntrega(guardada);
      borrarBorrador();
    }
  }

  function iniciarReintento() {
    prepararReintento();
    setError(null);
    setResultado(null);
    setIndiceActual(0);
    setRespuestas(rondas.map(() => ({ opcion: "", justificacion: "" })));
    borrarBorrador();
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
              {cargando ? "Guardando…" : "Guardar mis respuestas"}
            </Boton>
          )}
        </>
      ) : (
        <>
          {rondas.length > 1 && !bloqueado && (
            <p className="rounded-xl bg-indigo-50 px-4 py-3 text-xs leading-relaxed text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
              Al continuar guardamos un borrador solo en este dispositivo. Tus respuestas se entregan cuando pulses <strong>Guardar mis respuestas</strong> al final.
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
                  {cargando ? "Guardando…" : "Guardar mis respuestas"}
                </Boton>
              )
            ) : (
              <Boton type="button" onClick={irASiguiente}>
                Guardar borrador y continuar
              </Boton>
            )}
          </div>
        </>
      )}
      {!bloqueado && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Tu borrador se guarda solo en este dispositivo hasta que entregues.
        </p>
      )}
      <PieEntregaAuto error={null} bloqueado={bloqueado} cargando={cargando} puntaje={mejorPuntaje} intentos={intentos} onReintentar={iniciarReintento} />
    </form>
  );
}
