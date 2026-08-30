"use client";

import { MAX_INTENTOS_AUTO } from "@/lib/intentos-auto";
import Boton from "@/components/ui/button";

export default function AvisoReintento({
  puntaje,
  intentos,
  maxIntentos = MAX_INTENTOS_AUTO,
  onReintentar,
  cargando = false,
}: {
  puntaje: number | null;
  intentos: number;
  maxIntentos?: number;
  onReintentar: () => void;
  cargando?: boolean;
}) {
  if (intentos < 1) return null;
  const puedeReintentar = intentos < maxIntentos;
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30"
    >
      <p className="text-sm text-emerald-800 dark:text-emerald-200">
        {puntaje == null
          ? "Tu respuesta quedó guardada."
          : `Tu mejor resultado es ${puntaje}%.`}{" "}
        Has usado {intentos} de {maxIntentos} {maxIntentos === 1 ? "intento" : "intentos"}.
      </p>
      <p className="text-xs text-emerald-700 dark:text-emerald-300">
        {puedeReintentar
          ? "Puedes revisar tu respuesta y hacer un segundo ejercicio con un texto diferente."
          : "Tu respuesta quedó registrada y puedes continuar con la reflexión. Si detectaste un problema, repórtalo desde el botón de ayuda."}
      </p>
      {puedeReintentar && (
        <Boton type="button" onClick={onReintentar} cargando={cargando} className="self-start">
          {cargando ? "Preparando..." : "Intentar con otro texto"}
        </Boton>
      )}
    </div>
  );
}
