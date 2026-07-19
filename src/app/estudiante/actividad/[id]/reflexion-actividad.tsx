"use client";

import { useState } from "react";
import { Gauge, Lightbulb } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/mensaje-error";
import { Textarea, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import { mensajeCalibracion, placeholderReflexion } from "@/lib/calibracion-confianza";

export default function ReflexionActividad({
  actividadId,
  estudianteId,
  confianza,
  puntajeAuto,
  textoPrevio,
}: {
  actividadId: string;
  estudianteId: string;
  confianza: number | null;
  puntajeAuto: number | null;
  textoPrevio: string | null;
}) {
  const [editando, setEditando] = useState(!textoPrevio);
  const [texto, setTexto] = useState(textoPrevio ?? "");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mensaje = confianza != null && puntajeAuto != null ? mensajeCalibracion(confianza, puntajeAuto) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const supabase = createClient();
    const { error: upsertError } = await supabase.from("reflexiones").upsert(
      { estudiante_id: estudianteId, actividad_id: actividadId, momento: "cierre", texto },
      { onConflict: "estudiante_id,actividad_id,momento" },
    );

    if (upsertError) {
      setError(mensajeError(upsertError));
      setCargando(false);
      return;
    }

    setCargando(false);
    setEditando(false);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 dark:border-indigo-900 dark:bg-indigo-950/40">
      {mensaje && (
        <div className="flex items-start gap-2.5">
          <Gauge className="mt-0.5 size-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <p className="text-sm text-slate-700 dark:text-slate-300">{mensaje}</p>
        </div>
      )}
      {!editando ? (
        <>
          <p className="flex items-start gap-1.5 text-sm italic text-slate-700 dark:text-slate-300">
            <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-indigo-500" aria-hidden="true" />
            &quot;{texto}&quot;
          </p>
          <Boton type="button" variant="secondary" size="sm" onClick={() => setEditando(true)} className="self-start">
            Cambiar
          </Boton>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-slate-50">
            <Lightbulb className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            Tu reflexión
          </div>
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={2}
            placeholder={placeholderReflexion(confianza, puntajeAuto)}
          />
          {error && <ErrorText>{error}</ErrorText>}
          <Boton type="submit" size="sm" disabled={!texto.trim()} cargando={cargando} className="self-start">
            {cargando ? "Guardando..." : "Guardar reflexión"}
          </Boton>
        </form>
      )}
    </div>
  );
}
