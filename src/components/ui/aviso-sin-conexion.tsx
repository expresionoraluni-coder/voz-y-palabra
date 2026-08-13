"use client";

import { useEffect, useState } from "react";
import { CloudOff } from "lucide-react";

export default function AvisoSinConexion({
  mensaje = "Estás sin conexión. Puedes leer lo que ya está abierto; espera para guardar tus respuestas.",
}: {
  mensaje?: string;
}) {
  const [enLinea, setEnLinea] = useState(true);

  useEffect(() => {
    const actualizar = () => setEnLinea(navigator.onLine);
    actualizar();
    window.addEventListener("online", actualizar);
    window.addEventListener("offline", actualizar);
    return () => {
      window.removeEventListener("online", actualizar);
      window.removeEventListener("offline", actualizar);
    };
  }, []);

  if (enLinea) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-30 flex items-center justify-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900 dark:border-amber-900 dark:bg-amber-950/90 dark:text-amber-100"
    >
      <CloudOff className="size-4 shrink-0" aria-hidden="true" />
      {mensaje}
    </div>
  );
}
