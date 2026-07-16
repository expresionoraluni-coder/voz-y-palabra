"use client";

import { useMemo, useState } from "react";
import { Check, Lightbulb } from "lucide-react";
import { useEntregaActividad } from "@/hooks/useEntregaActividad";
import { Field, Label, Textarea, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import { ideasClaveMencionadas } from "@/lib/ideas-clave";
import { contarPalabras } from "@/lib/contar-palabras";

export default function OpcionJustificacion({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: { pregunta: string; opciones: string[]; ideas_clave?: string[] };
  respuestaPrevia?: { opcion: string; justificacion: string };
}) {
  const { cargando, guardado, error, setError, guardar, marcarSinGuardar } = useEntregaActividad(actividadId, estudianteId);
  const [opcion, setOpcion] = useState(respuestaPrevia?.opcion ?? "");
  const [justificacion, setJustificacion] = useState(
    respuestaPrevia?.justificacion ?? "",
  );

  const ideasMencionadas = useMemo(
    () => ideasClaveMencionadas(justificacion, contenido.ideas_clave ?? []),
    [justificacion, contenido.ideas_clave],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (contarPalabras(justificacion) < 6) {
      setError("Explica un poco más tu razonamiento antes de guardar.");
      return;
    }

    await guardar({ respuesta: { opcion, justificacion }, estado: "pendiente_revision" });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-3">
        <legend className="font-medium text-slate-900 dark:text-slate-50">{contenido.pregunta}</legend>
        <div className="flex flex-col gap-2">
        {contenido.opciones.map((op) => {
          const seleccionada = opcion === op;
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
                name="opcion"
                value={op}
                checked={seleccionada}
                onChange={() => {
                  setOpcion(op);
                  marcarSinGuardar();
                }}
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
          value={justificacion}
          onChange={(e) => {
            setJustificacion(e.target.value);
            marcarSinGuardar();
          }}
          rows={3}
        />
      </Field>
      {contenido.ideas_clave && contenido.ideas_clave.length > 0 && contarPalabras(justificacion) >= 4 && (
        <p className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-500">
          <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-indigo-500" aria-hidden="true" />
          {ideasMencionadas.length === 0
            ? "Aún no mencionas ninguna de las ideas que esperábamos en tu justificación — ¿qué más notaste?"
            : `Mencionas ${ideasMencionadas.length} de ${contenido.ideas_clave.length} ideas que esperábamos.`}
        </p>
      )}
      {error && <ErrorText>{error}</ErrorText>}
      {guardado && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Guardado. Puedes cambiar tu respuesta cuando quieras.
        </p>
      )}
      <Boton type="submit" cargando={cargando}>
        {cargando ? "Guardando..." : "Guardar mi respuesta"}
      </Boton>
    </form>
  );
}
