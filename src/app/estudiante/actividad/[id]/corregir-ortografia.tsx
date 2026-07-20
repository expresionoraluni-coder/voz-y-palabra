"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useEntregaActividad } from "@/hooks/useEntregaActividad";
import { Field, Label, HelpText, Textarea, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import { bloquearCopiar, bloquearPegado } from "@/lib/anti-copiar";
import { contarPalabras } from "@/lib/contar-palabras";
import { calificarOrtografia, type ComparacionPalabra } from "@/lib/comparar-ortografia";

export default function CorregirOrtografia({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: { contexto?: string | null; texto_incorrecto: string; texto_correcto: string; temas?: string[] };
  respuestaPrevia?: { texto_reescrito: string };
}) {
  const { cargando, error, setError, guardar } = useEntregaActividad(actividadId, estudianteId);
  const [textoReescrito, setTextoReescrito] = useState(respuestaPrevia?.texto_reescrito ?? "");
  // Igual que en clasificacion.tsx: si ya había una entrega previa, se
  // recalifica de una vez contra el contenido actual — así se muestra
  // bloqueada desde el primer render, sin exponer una respuesta editable
  // que ya fue calificada.
  // Se exige que texto_reescrito exista de verdad (no solo que
  // respuestaPrevia sea un objeto truthy): una entrega vieja de un tipo
  // anterior con otra forma de respuesta (ej. { elegidas: [...] } de
  // etiquetado_texto, si la actividad cambió de tipo) no debe tronar la
  // calificación — se trata como si no hubiera entrega todavía.
  const [resultado, setResultado] = useState<ReturnType<typeof calificarOrtografia> | null>(
    respuestaPrevia?.texto_reescrito ? calificarOrtografia(contenido.texto_correcto, respuestaPrevia.texto_reescrito) : null,
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

    const calificacion = calificarOrtografia(contenido.texto_correcto, textoReescrito);
    const ok = await guardar({
      respuesta: { texto_reescrito: textoReescrito },
      estado: "completada",
      puntaje_auto: calificacion.puntajeAuto,
    });
    if (ok) setResultado(calificacion);
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
