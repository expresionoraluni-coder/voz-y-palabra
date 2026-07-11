"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Select, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

type Elemento = { texto: string; categoria_correcta: string };

export default function Clasificacion({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: { categorias: string[]; elementos: Elemento[] };
  respuestaPrevia?: { elegidas: string[] };
}) {
  const router = useRouter();
  const [elegidas, setElegidas] = useState<string[]>(
    respuestaPrevia?.elegidas ?? contenido.elementos.map(() => ""),
  );
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<boolean[] | null>(null);

  function actualizar(indice: number, valor: string) {
    setElegidas((prev) => prev.map((v, i) => (i === indice ? valor : v)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (elegidas.some((v) => !v)) {
      setError("Clasifica todos los elementos antes de guardar.");
      return;
    }

    const aciertos = contenido.elementos.map((el, i) => el.categoria_correcta === elegidas[i]);
    const puntajeAuto = Math.round(
      (aciertos.filter(Boolean).length / contenido.elementos.length) * 100,
    );

    setCargando(true);
    const supabase = createClient();
    const { error: upsertError } = await supabase.from("entregas").upsert(
      {
        estudiante_id: estudianteId,
        actividad_id: actividadId,
        respuesta: { elegidas },
        estado: "completada",
        puntaje_auto: puntajeAuto,
      },
      { onConflict: "estudiante_id,actividad_id" },
    );

    if (upsertError) {
      setError(upsertError.message);
      setCargando(false);
      return;
    }

    setResultado(aciertos);
    setCargando(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {contenido.elementos.map((el, i) => (
        <div
          key={i}
          className="flex flex-col gap-2.5 rounded-xl border border-slate-200 px-4 py-3.5 dark:border-slate-800"
        >
          <p className="text-sm text-slate-900 dark:text-slate-50">{el.texto}</p>
          <Select value={elegidas[i]} onChange={(e) => actualizar(i, e.target.value)}>
            <option value="">Elige una categoría</option>
            {contenido.categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          {resultado && (
            <p
              className={`flex items-center gap-1.5 text-sm ${
                resultado[i]
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {resultado[i] ? (
                <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              ) : (
                <XCircle className="size-4 shrink-0" aria-hidden="true" />
              )}
              {resultado[i] ? "Correcto" : `Era: ${el.categoria_correcta}`}
            </p>
          )}
        </div>
      ))}
      {error && <ErrorText>{error}</ErrorText>}
      <Boton type="submit" cargando={cargando}>
        {cargando ? "Guardando..." : "Guardar y revisar"}
      </Boton>
    </form>
  );
}
