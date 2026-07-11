"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Select, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

type Fragmento = { texto: string; etiqueta_correcta: string };

export default function EtiquetadoTexto({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: { contexto: string | null; etiquetas: string[]; fragmentos: Fragmento[] };
  respuestaPrevia?: { elegidas: string[] };
}) {
  const router = useRouter();
  const [elegidas, setElegidas] = useState<string[]>(
    respuestaPrevia?.elegidas ?? contenido.fragmentos.map(() => ""),
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
      setError("Etiqueta todos los fragmentos antes de guardar.");
      return;
    }

    const aciertos = contenido.fragmentos.map((f, i) => f.etiqueta_correcta === elegidas[i]);
    const puntajeAuto = Math.round(
      (aciertos.filter(Boolean).length / contenido.fragmentos.length) * 100,
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
      {contenido.contexto && (
        <p className="text-sm text-slate-500 dark:text-slate-500">{contenido.contexto}</p>
      )}
      {contenido.fragmentos.map((f, i) => (
        <div
          key={i}
          className="flex flex-col gap-2.5 rounded-xl border border-slate-200 px-4 py-3.5 dark:border-slate-800"
        >
          <p className="text-sm italic text-slate-900 dark:text-slate-50">&ldquo;{f.texto}&rdquo;</p>
          <Select value={elegidas[i]} onChange={(e) => actualizar(i, e.target.value)}>
            <option value="">Elige una etiqueta</option>
            {contenido.etiquetas.map((e) => (
              <option key={e} value={e}>
                {e}
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
              {resultado[i] ? "Correcto" : `Era: ${f.etiqueta_correcta}`}
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
