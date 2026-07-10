"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Field, Label, Textarea, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

export default function OpcionJustificacion({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: { pregunta: string; opciones: string[] };
  respuestaPrevia?: { opcion: string; justificacion: string };
}) {
  const router = useRouter();
  const [opcion, setOpcion] = useState(respuestaPrevia?.opcion ?? "");
  const [justificacion, setJustificacion] = useState(
    respuestaPrevia?.justificacion ?? "",
  );
  const [cargando, setCargando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardado(false);
    setCargando(true);

    const supabase = createClient();
    const { error: upsertError } = await supabase.from("entregas").upsert(
      {
        estudiante_id: estudianteId,
        actividad_id: actividadId,
        respuesta: { opcion, justificacion },
        estado: "completada",
      },
      { onConflict: "estudiante_id,actividad_id" },
    );

    if (upsertError) {
      setError(upsertError.message);
      setCargando(false);
      return;
    }

    setGuardado(true);
    setCargando(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <p className="font-medium text-slate-900 dark:text-slate-50">{contenido.pregunta}</p>
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
                onChange={() => setOpcion(op)}
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
      <Field>
        <Label htmlFor="justificacion">¿Por qué elegiste esa opción?</Label>
        <Textarea
          id="justificacion"
          required
          value={justificacion}
          onChange={(e) => setJustificacion(e.target.value)}
          rows={3}
        />
      </Field>
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
