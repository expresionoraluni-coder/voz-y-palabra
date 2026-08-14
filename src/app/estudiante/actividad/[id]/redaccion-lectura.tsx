"use client";

import { useState } from "react";
import { useEntregaActividad } from "@/hooks/useEntregaActividad";
import Boton from "@/components/ui/button";
import { Field, Label, Textarea, ErrorText } from "@/components/ui/field";
import { bloquearCopiar } from "@/lib/anti-copiar";
import { validarRespuestaComprension } from "@/lib/validar-respuesta-comprension";
import { guardarEntregaAbiertaAccion } from "./acciones-entrega";

export default function RedaccionLectura({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: {
    texto_fuente: string | null;
    titulo_fuente?: string | null;
    ejemplo_resumen: string;
    ejemplo_sintesis: string;
    ejemplo_parafrasis: string;
  };
  respuestaPrevia?: Record<string, unknown>;
}) {
  const { cargando, guardarConAccion } = useEntregaActividad(actividadId, estudianteId);
  const respuestaPreviaTexto =
    typeof respuestaPrevia?.respuesta_comprension === "string" ? respuestaPrevia.respuesta_comprension : "";
  const [respuestaComprension, setRespuestaComprension] = useState(respuestaPreviaTexto);
  const [error, setError] = useState<string | null>(null);
  const [entregado, setEntregado] = useState(Boolean(respuestaPreviaTexto.trim()));

  const columnas = [
    { etiqueta: "Resumen", texto: contenido.ejemplo_resumen },
    { etiqueta: "Síntesis", texto: contenido.ejemplo_sintesis },
    { etiqueta: "Paráfrasis", texto: contenido.ejemplo_parafrasis },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (entregado) return;
    const errorValidacion = validarRespuestaComprension(respuestaComprension);
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }
    setError(null);
    const guardada = await guardarConAccion(() =>
      guardarEntregaAbiertaAccion(
        actividadId,
        "redaccion_checklist",
        { respuesta_comprension: respuestaComprension.trim() },
        "completada",
      ),
    );
    if (guardada) setEntregado(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {contenido.texto_fuente && (
        <div
          onCopy={bloquearCopiar}
          onContextMenu={(e) => e.preventDefault()}
          className="flex max-h-52 select-none flex-col gap-1.5 overflow-auto rounded-xl bg-slate-50 px-4 py-3.5 dark:bg-slate-800/60"
        >
          {contenido.titulo_fuente && (
            <p className="font-semibold text-slate-900 dark:text-slate-50">{contenido.titulo_fuente}</p>
          )}
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{contenido.texto_fuente}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {columnas.map((c) => (
          <div
            key={c.etiqueta}
            onCopy={bloquearCopiar}
            onContextMenu={(e) => e.preventDefault()}
            className="flex select-none flex-col gap-2 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
              {c.etiqueta}
            </p>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{c.texto}</p>
          </div>
        ))}
      </div>

      <Field>
        <Label htmlFor="respuesta-comprension">Pregunta para comprobar tu comprensión</Label>
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          ¿Qué diferencia principal encuentras entre el resumen, la síntesis y la paráfrasis?
        </p>
        <Textarea
          id="respuesta-comprension"
          value={respuestaComprension}
          onChange={(e) => setRespuestaComprension(e.target.value)}
          onPaste={bloquearCopiar}
          disabled={entregado}
          rows={3}
          placeholder="Explica la diferencia con tus propias palabras."
        />
        {error && <ErrorText>{error}</ErrorText>}
      </Field>

      {!entregado && (
        <Boton type="submit" cargando={cargando}>
          {cargando ? "Guardando..." : "Guardar respuesta y continuar"}
        </Boton>
      )}
    </form>
  );
}
