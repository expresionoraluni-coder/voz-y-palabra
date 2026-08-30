"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useEntregaActividad } from "@/hooks/useEntregaActividad";
import { Field, Label, HelpText, Textarea } from "@/components/ui/field";
import PieEntregaAuto from "@/components/estudiante/pie-entrega-auto";
import { useIntentosAuto } from "@/hooks/useIntentosAuto";
import { bloquearCopiar, bloquearPegado } from "@/lib/anti-copiar";
import { contarPalabras } from "@/lib/contar-palabras";
import type { ComparacionPalabraPublica, ContenidoOrtografiaPublico } from "@/lib/comparar-ortografia";
import { calificarCorregirOrtografia } from "./acciones-calificacion";

type ResultadoOrtografia = { comparacion: ComparacionPalabraPublica[]; totalPalabras: number; errores: number; aprobado: boolean };

export default function CorregirOrtografia({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
  puntajeAuto,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: ContenidoOrtografiaPublico;
  respuestaPrevia?: {
    texto_reescrito: string;
    comparacion?: ComparacionPalabraPublica[];
    totalPalabras?: number;
    errores?: number;
    aprobado?: boolean;
  };
  puntajeAuto?: number | null;
}) {
  const { cargando, error, setError, guardarConAccion, prepararReintento, entregaRegistrada } = useEntregaActividad(actividadId, estudianteId, Boolean(respuestaPrevia));
  const { intentos, mejorPuntaje, registrarEntrega } = useIntentosAuto(
    respuestaPrevia,
    puntajeAuto ?? null,
    Boolean(respuestaPrevia),
  );
  const [textoReescrito, setTextoReescrito] = useState(respuestaPrevia?.texto_reescrito ?? "");
  // El servidor devuelve únicamente la palabra escrita y el resultado; la
  // palabra correcta nunca se guarda en la respuesta visible al estudiante.
  const [resultado, setResultado] = useState<ResultadoOrtografia | null>(
    respuestaPrevia?.comparacion
      ? {
          comparacion: respuestaPrevia.comparacion,
          totalPalabras: respuestaPrevia.totalPalabras ?? 0,
          errores: respuestaPrevia.errores ?? 0,
          aprobado: respuestaPrevia.aprobado ?? false,
        }
      : null,
  );
  const bloqueado = entregaRegistrada || resultado !== null;
  const temasNormalizados = (contenido.temas ?? []).map((tema) =>
    tema.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(),
  );
  const correccionesPermitidas: string[] = [];
  if (temasNormalizados.some((tema) => tema.includes("mayus"))) {
    correccionesPermitidas.push("mayúsculas y minúsculas");
  }
  if (temasNormalizados.some((tema) => tema.includes("acent") || tema.includes("tilde"))) {
    correccionesPermitidas.push("tildes");
  }
  if (temasNormalizados.some((tema) => tema.includes("b/v"))) correccionesPermitidas.push("letras b/v");
  if (temasNormalizados.some((tema) => tema.includes("g/j"))) correccionesPermitidas.push("letras g/j");
  if (temasNormalizados.some((tema) => tema.includes("s/c/z") || tema.includes("s/z"))) {
    correccionesPermitidas.push("letras s/c/z");
  }
  if (temasNormalizados.some((tema) => /(^|[^a-z])h([^a-z]|$)/.test(tema))) {
    correccionesPermitidas.push("letra h");
  }
  const listaCorrecciones = correccionesPermitidas.length > 1
    ? `${correccionesPermitidas.slice(0, -1).join(", ")} y ${correccionesPermitidas.at(-1)}`
    : correccionesPermitidas[0] ?? "los errores ortográficos señalados";
  const ayudaCorreccion = `Reescribe el texto completo. Corrige únicamente ${listaCorrecciones}. No cambies el orden ni la cantidad de palabras y no modifiques los signos de puntuación. Se aceptan hasta 5 errores.`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (bloqueado) return;
    setError(null);

    if (!textoReescrito.trim()) {
      setError("Escribe tu versión corregida.");
      return;
    }
    if (textoReescrito.trim() === contenido.texto_incorrecto.trim()) {
      setError("Tu texto es idéntico al original. No hiciste ninguna corrección.");
      return;
    }

    const guardada = await guardarConAccion(() => calificarCorregirOrtografia(actividadId, textoReescrito));
    if (guardada) {
      setResultado({
        comparacion: guardada.comparacion as ComparacionPalabraPublica[],
        totalPalabras: guardada.totalPalabras as number,
        errores: guardada.errores as number,
        aprobado: guardada.aprobado as boolean,
      });
      registrarEntrega(guardada);
    }
  }

  function iniciarReintento() {
    prepararReintento();
    setError(null);
    setResultado(null);
    setTextoReescrito("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {contenido.contexto && (
        <p className="text-sm text-slate-500 dark:text-slate-500">{contenido.contexto}</p>
      )}

      <div
        onCopy={bloquearCopiar}
        onContextMenu={(e) => e.preventDefault()}
        className="select-none rounded-xl bg-slate-50 px-4 py-3.5 text-sm leading-relaxed text-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
      >
        {contenido.texto_incorrecto}
      </div>

      {contenido.temas && contenido.temas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {contenido.temas.map((t) => (
            <span
              key={t}
              className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {!bloqueado ? (
        <Field>
          <Label htmlFor="texto-reescrito">Tu versión corregida</Label>
          <HelpText>{ayudaCorreccion}</HelpText>
          <Textarea
            id="texto-reescrito"
            required
            rows={6}
            value={textoReescrito}
            onChange={(e) => setTextoReescrito(e.target.value)}
            onPaste={bloquearPegado}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <p className="self-end text-xs text-slate-500 dark:text-slate-400">
            {contarPalabras(textoReescrito)} palabras
          </p>
        </Field>
      ) : (
        <div className="flex flex-col gap-3">
          <p
            className={`flex items-center gap-1.5 text-sm font-medium ${
              resultado!.aprobado ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            }`}
          >
            {resultado!.aprobado ? (
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <XCircle className="size-4 shrink-0" aria-hidden="true" />
            )}
            {resultado!.errores} error{resultado!.errores === 1 ? "" : "es"} de {resultado!.totalPalabras} palabras
            {resultado!.aprobado ? " Está dentro del máximo aceptable (5)." : " Tiene más de los 5 errores aceptables."}
          </p>
          <p className="rounded-xl border border-slate-200 px-4 py-3.5 text-sm leading-[2.2] dark:border-slate-800">
            {resultado!.comparacion.map((c: ComparacionPalabraPublica, i: number) => (
              <span key={i}>
                <span className={c.correcto ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}>
                  {c.escrita || "(faltó)"}
                </span>
                {!c.correcto && <span className="text-xs text-slate-500 dark:text-slate-500"> (revisa esta palabra)</span>}{" "}
              </span>
            ))}
          </p>
        </div>
      )}

      <PieEntregaAuto error={error} bloqueado={bloqueado} cargando={cargando} puntaje={mejorPuntaje} intentos={intentos} onReintentar={iniciarReintento} />
    </form>
  );
}
