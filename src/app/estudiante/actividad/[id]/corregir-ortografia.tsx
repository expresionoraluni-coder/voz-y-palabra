"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useEntregaActividad } from "@/hooks/useEntregaActividad";
import { Field, Label, HelpText, Textarea, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import { bloquearCopiar, bloquearPegado } from "@/lib/anti-copiar";
import { contarPalabras } from "@/lib/contar-palabras";
import type { ComparacionPalabra, ContenidoOrtografiaPublico } from "@/lib/comparar-ortografia";
import { calificarCorregirOrtografia } from "./acciones-calificacion";

type ResultadoOrtografia = { comparacion: ComparacionPalabra[]; totalPalabras: number; errores: number; aprobado: boolean };

export default function CorregirOrtografia({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: ContenidoOrtografiaPublico;
  respuestaPrevia?: {
    texto_reescrito: string;
    comparacion?: ComparacionPalabra[];
    totalPalabras?: number;
    errores?: number;
    aprobado?: boolean;
  };
}) {
  const { cargando, error, setError, guardarConAccion } = useEntregaActividad(actividadId, estudianteId);
  const [textoReescrito, setTextoReescrito] = useState(respuestaPrevia?.texto_reescrito ?? "");
  // El detalle de la comparación ya se calificó en el servidor al entregar
  // (ver acciones-calificacion.ts) y se guardó junto a la respuesta — aquí
  // solo se lee, nunca se recalcula (la clave `texto_correcto` ya no llega
  // al cliente). Se exige que `comparacion` exista de verdad: una entrega
  // vieja de un tipo anterior con otra forma de respuesta, o de antes de
  // este cambio, se trata como si no hubiera entrega todavía en vez de
  // tronar.
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
  const bloqueado = resultado !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (bloqueado) return;
    setError(null);

    if (!textoReescrito.trim()) {
      setError("Escribe tu versión corregida.");
      return;
    }
    if (textoReescrito.trim() === contenido.texto_incorrecto.trim()) {
      setError("Tu texto es idéntico al original — no hiciste ninguna corrección.");
      return;
    }

    const guardada = await guardarConAccion(() => calificarCorregirOrtografia(actividadId, textoReescrito));
    if (guardada) {
      setResultado({
        comparacion: guardada.comparacion as ComparacionPalabra[],
        totalPalabras: guardada.totalPalabras as number,
        errores: guardada.errores as number,
        aprobado: guardada.aprobado as boolean,
      });
    }
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
          <HelpText>
            Reescribe el texto completo corrigiendo solo mayúsculas, tildes y letras (b/v, s/c/z, g/j, h) — no
            cambies el orden ni la cantidad de palabras, y no toques los signos de puntuación. Se aceptan hasta
            5 errores.
          </HelpText>
          <Textarea
            id="texto-reescrito"
            required
            rows={6}
            value={textoReescrito}
            onChange={(e) => setTextoReescrito(e.target.value)}
            onPaste={bloquearPegado}
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
            {resultado!.aprobado ? " — dentro del máximo aceptable (5)." : " — más de los 5 aceptables."}
          </p>
          <p className="rounded-xl border border-slate-200 px-4 py-3.5 text-sm leading-[2.2] dark:border-slate-800">
            {resultado!.comparacion.map((c: ComparacionPalabra, i: number) => (
              <span key={i}>
                <span className={c.correcto ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}>
                  {c.escrita || "(faltó)"}
                </span>
                {!c.correcto && c.correcta && (
                  <span className="text-xs text-slate-500 dark:text-slate-500"> (era: {c.correcta})</span>
                )}{" "}
              </span>
            ))}
          </p>
        </div>
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
