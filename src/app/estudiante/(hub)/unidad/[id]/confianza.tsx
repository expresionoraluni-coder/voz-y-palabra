"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gauge } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import { guardarConfianzaUnidad } from "../../../acciones-reflexiones";

const NIVELES_CONFIANZA = [
  { valor: 1, etiqueta: "Nada" },
  { valor: 2, etiqueta: "Poco" },
  { valor: 3, etiqueta: "Algo" },
  { valor: 4, etiqueta: "Mucho" },
  { valor: 5, etiqueta: "Totalmente" },
] as const;

export default function Confianza({
  unidadId,
  momento = "inicio",
  valorPrevio = null,
  onGuardado,
}: {
  unidadId: string;
  momento?: "inicio" | "cierre";
  valorPrevio?: number | null;
  onGuardado?: () => void;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(valorPrevio ?? 3);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esCierre = momento === "cierre";
  const titulo = esCierre
    ? "Al terminar: ¿qué tanta seguridad tienes sobre lo que aprendiste?"
    : "Antes de empezar: ¿qué tan preparado o preparada te sientes para trabajar estos objetivos?";
  const ariaLabel = esCierre
    ? "Qué tanta seguridad tienes al terminar la unidad"
    : "Qué tan preparado o preparada te sientes para trabajar los objetivos de esta unidad";

  async function guardar() {
    if (cargando) return;
    setError(null);
    setCargando(true);
    try {
      const resultado = await guardarConfianzaUnidad(unidadId, momento, valor);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      if (esCierre) {
        try {
          const supabase = (await import("@/lib/supabase/client")).createClient();
          await supabase.rpc("verificar_insignias");
        } catch {
          // El guardado no depende de actualizar la insignia en este instante.
        }
      }
      onGuardado?.();
      router.refresh();
    } catch {
      setError("No pudimos guardar tu nivel de seguridad. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  if (esCierre && valorPrevio !== null) {
    return (
      <Card className="flex flex-col gap-2.5 border-emerald-100 bg-emerald-50/60 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
        <div className="flex items-center gap-2">
          <Gauge className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Tu seguridad al terminar</p>
        </div>
        <p className="text-2xl font-semibold text-emerald-700 dark:text-emerald-300">{valorPrevio}/5</p>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Esta respuesta quedó guardada como parte de tu cierre.
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <Gauge className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <div>
          {!esCierre && <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">Paso 2 de 2</p>}
          <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{titulo}</p>
        </div>
      </div>
      <div role="group" aria-label={ariaLabel} className="grid grid-cols-5 gap-2">
        {NIVELES_CONFIANZA.map(({ valor: nivel, etiqueta }) => (
          <button
            key={nivel}
            type="button"
            onClick={() => setValor(nivel)}
            aria-pressed={valor === nivel}
            aria-label={`${nivel} de 5: ${etiqueta}`}
            className={`min-h-11 rounded-xl border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              valor === nivel
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {nivel}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-2 text-center text-[11px] leading-tight text-slate-500 dark:text-slate-400" aria-hidden="true">
        {NIVELES_CONFIANZA.map(({ valor, etiqueta }) => <span key={valor}>{etiqueta}</span>)}
      </div>
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Elige la opción que mejor describa cómo te sientes. Puedes cambiar la selección antes de guardarla.
      </p>
      {error && <ErrorText>{error}</ErrorText>}
      <Boton onClick={guardar} cargando={cargando} size="sm" className="self-start">
        {cargando ? "Guardando…" : esCierre ? "Guardar nivel" : "Guardar"}
      </Boton>
    </Card>
  );
}
