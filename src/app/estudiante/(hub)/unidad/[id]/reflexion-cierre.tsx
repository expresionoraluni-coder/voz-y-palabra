"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gauge, Lightbulb } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/mensaje-error";
import { Card } from "@/components/ui/card";
import { Textarea, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import { mensajeCalibracionUnidad, placeholderReflexionUnidad } from "@/lib/calibracion-confianza";

export default function ReflexionCierre({
  estudianteId,
  unidadId,
  metaPrevia,
  textoPrevio,
  confianzaInicioPct,
  promedioUnidad,
}: {
  estudianteId: string;
  unidadId: string;
  metaPrevia?: string | null;
  textoPrevio?: string | null;
  confianzaInicioPct: number | null;
  promedioUnidad: number | null;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(!textoPrevio);
  const [texto, setTexto] = useState(textoPrevio ?? "");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mensaje = mensajeCalibracionUnidad(confianzaInicioPct, promedioUnidad);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const supabase = createClient();
    const { error: upsertError } = await supabase.from("reflexiones").upsert(
      { estudiante_id: estudianteId, unidad_id: unidadId, momento: "cierre", texto },
      { onConflict: "estudiante_id,unidad_id,momento" },
    );

    if (upsertError) {
      setError(mensajeError(upsertError));
      setCargando(false);
      return;
    }

    // Igual que en bitácora/confianza: las reflexiones de cierre cuentan
    // para "Primera reflexión"/"Mente reflexiva".
    try {
      await supabase.rpc("verificar_insignias");
    } catch {
      // silencioso a propósito
    }

    setCargando(false);
    setEditando(false);
    router.refresh();
  }

  if (!editando) {
    // Sin botón "Cambiar" a propósito: igual que la reflexión de cada
    // actividad, una vez guardada queda fija — es una fotografía honesta
    // de lo que pensaste al cerrar la unidad, no algo para pulir después.
    return (
      <Card className="flex flex-col gap-2.5 p-5">
        <div className="flex items-center gap-2">
          <Lightbulb className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Tu reflexión de cierre</p>
        </div>
        {mensaje && (
          <div className="flex items-start gap-2.5 rounded-lg bg-indigo-50/60 px-3 py-2 dark:bg-indigo-950/40">
            <Gauge className="mt-0.5 size-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <p className="text-sm text-slate-700 dark:text-slate-300">{mensaje}</p>
          </div>
        )}
        <p className="text-sm italic text-slate-700 dark:text-slate-300">&quot;{texto}&quot;</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <Lightbulb className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
          Terminaste la unidad: ¿qué aprendiste?
        </p>
      </div>
      {mensaje && (
        <div className="flex items-start gap-2.5 rounded-lg bg-indigo-50/60 px-3 py-2 dark:bg-indigo-950/40">
          <Gauge className="mt-0.5 size-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <p className="text-sm text-slate-700 dark:text-slate-300">{mensaje}</p>
        </div>
      )}
      {metaPrevia && (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm italic text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
          Al empezar dijiste: &quot;{metaPrevia}&quot;
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={3}
          placeholder={placeholderReflexionUnidad(confianzaInicioPct, promedioUnidad)}
        />
        {error && <ErrorText>{error}</ErrorText>}
        <Boton type="submit" size="sm" disabled={!texto.trim()} cargando={cargando} className="self-start">
          {cargando ? "Guardando..." : "Guardar reflexión"}
        </Boton>
      </form>
    </Card>
  );
}
