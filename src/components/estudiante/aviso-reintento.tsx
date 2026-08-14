"use client";

import { RotateCcw } from "lucide-react";
import Boton from "@/components/ui/button";
import { MAX_INTENTOS_AUTO, PUNTAJE_DESBLOQUEO } from "@/lib/intentos-auto";

export default function AvisoReintento({
  puntaje,
  intentos,
  onReintentar,
  cargando = false,
}: {
  puntaje: number | null;
  intentos: number;
  onReintentar: () => void;
  cargando?: boolean;
}) {
  if (puntaje == null || intentos < 1) return null;

  const aprobado = puntaje >= PUNTAJE_DESBLOQUEO;
  const puedeReintentar = !aprobado && intentos < MAX_INTENTOS_AUTO;
  const restantes = MAX_INTENTOS_AUTO - intentos;

  return (
    <div
      role="status"
      className={`flex flex-col gap-2 rounded-xl border px-4 py-3 ${
        aprobado
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
          : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
      }`}
    >
      <p
        className={`text-sm ${
          aprobado
            ? "text-emerald-800 dark:text-emerald-200"
            : "text-amber-800 dark:text-amber-200"
        }`}
      >
        {aprobado
          ? `Tu mejor resultado es ${puntaje}%. Ya puedes continuar.`
          : intentos >= MAX_INTENTOS_AUTO
            ? `Tu mejor resultado es ${puntaje}%. Ya usaste los ${MAX_INTENTOS_AUTO} intentos; puedes continuar y volver a repasar este tema cuando lo necesites.`
            : `Tu mejor resultado es ${puntaje}%. Tienes ${restantes} ${restantes === 1 ? "intento disponible" : "intentos disponibles"} para mejorar.`}
      </p>
      {puedeReintentar && (
        <Boton type="button" variant="secondary" size="sm" cargando={cargando} onClick={onReintentar} className="self-start">
          <RotateCcw className="size-4" aria-hidden="true" />
          {cargando ? "Preparando..." : "Intentar de nuevo"}
        </Boton>
      )}
    </div>
  );
}
