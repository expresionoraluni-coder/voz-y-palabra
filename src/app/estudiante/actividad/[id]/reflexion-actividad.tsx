"use client";

import { useState } from "react";
import { Gauge, Lightbulb } from "lucide-react";
import { Textarea, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import { mensajeCalibracion, placeholderReflexion } from "@/lib/calibracion-confianza";
import { guardarReflexionActividad } from "../../acciones-reflexiones";
import { useBorradorLocal } from "@/hooks/use-borrador-local";

export default function ReflexionActividad({
  actividadId,
  estudianteId,
  confianza,
  puntajeAuto,
  textoPrevio,
  placeholderPersonalizado,
  onGuardada,
  bloqueadaPorReintento = false,
}: {
  actividadId: string;
  estudianteId: string;
  confianza: number | null;
  puntajeAuto: number | null;
  textoPrevio: string | null;
  placeholderPersonalizado?: string;
  onGuardada?: () => void;
  bloqueadaPorReintento?: boolean;
}) {
  const [editando, setEditando] = useState(!textoPrevio);
  const { borrador, guardarBorrador, borrarBorrador } = useBorradorLocal<string>({
    estudianteId,
    tipo: "reflexion-actividad",
    recursoId: actividadId,
    habilitado: !textoPrevio,
  });
  const [texto, setTexto] = useState(textoPrevio ?? (typeof borrador === "string" ? borrador : ""));
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mensaje = confianza != null && puntajeAuto != null ? mensajeCalibracion(confianza, puntajeAuto) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cargando) return;
    setError(null);
    setCargando(true);

    try {
      const resultado = await guardarReflexionActividad(actividadId, texto);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }

      setEditando(false);
      borrarBorrador();
      onGuardada?.();
    } catch {
      setError("No pudimos guardar tu reflexión. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="relative flex flex-col gap-3 overflow-hidden rounded-[1.5rem] border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/70 p-5 shadow-sm dark:border-indigo-900/70 dark:from-indigo-950/40 dark:via-slate-900 dark:to-violet-950/25">
      <div aria-hidden="true" className="absolute -right-8 -top-8 size-28 rounded-full bg-indigo-200/45 blur-2xl dark:bg-indigo-800/20" />
      {mensaje && (
        <div className="relative flex items-start gap-2.5">
          <Gauge className="mt-0.5 size-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <p className="text-sm text-slate-700 dark:text-slate-300">{mensaje}</p>
        </div>
      )}
      {bloqueadaPorReintento ? (
        <p className="relative rounded-2xl border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          La reflexión se habilitará después del segundo ejercicio.
        </p>
      ) : !editando ? (
        // Sin botón "Cambiar" a propósito: una vez guardada, la reflexión
        // queda fija — igual que una entrega calificada, es una fotografía
        // honesta de lo que pensaste en ese momento, no algo para pulir
        // después de ver el resultado.
        <p className="relative flex items-start gap-1.5 rounded-2xl bg-white/65 px-3 py-2.5 text-sm italic text-slate-700 dark:bg-slate-900/55 dark:text-slate-300">
          <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-indigo-500" aria-hidden="true" />
          &quot;{texto}&quot;
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="relative flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-50">
            <Lightbulb className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            Tu reflexión
          </div>
          <Textarea
            value={texto}
            onChange={(e) => {
              const siguiente = e.target.value;
              setTexto(siguiente);
              guardarBorrador(siguiente);
            }}
            rows={2}
            placeholder={placeholderPersonalizado ?? placeholderReflexion(confianza, puntajeAuto)}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tu borrador se guarda solo en este dispositivo hasta que entregues.
          </p>
          {error && <ErrorText>{error}</ErrorText>}
          <Boton type="submit" size="sm" disabled={!texto.trim()} cargando={cargando} className="self-start">
            {cargando ? "Guardando…" : "Guardar reflexión"}
          </Boton>
        </form>
      )}
    </div>
  );
}
