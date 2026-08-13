"use client";

import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { CLAVE_GUIA } from "./guia-bienvenida";

export default function RestablecerGuia({ estudianteId }: { estudianteId: string }) {
  const router = useRouter();

  function mostrarGuia() {
    try {
      window.localStorage.removeItem(`${CLAVE_GUIA}:${estudianteId}`);
    } catch {
      // La guía se mostrará de todos modos durante la siguiente navegación.
    }
    router.push("/estudiante/inicio");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={mostrarGuia}
      className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-lg text-sm font-medium text-indigo-600 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-400"
    >
      <RotateCcw className="size-4" aria-hidden="true" />
      Volver a ver la guía de inicio
    </button>
  );
}
