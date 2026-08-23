"use client";

import { MAX_INTENTOS_AUTO } from "@/lib/intentos-auto";

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
  void onReintentar;
  void cargando;
  if (intentos < 1) return null;
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30"
    >
      <p className="text-sm text-emerald-800 dark:text-emerald-200">
        {puntaje == null
          ? "Tu respuesta quedó guardada."
          : `Tu mejor resultado es ${puntaje}%.`}{" "}
        Has usado {intentos} de {MAX_INTENTOS_AUTO} intento.
      </p>
      <p className="text-xs text-emerald-700 dark:text-emerald-300">
        Tu respuesta quedó registrada y puedes continuar con la reflexión. Si detectaste un problema, repórtalo desde el botón de ayuda.
      </p>
    </div>
  );
}
