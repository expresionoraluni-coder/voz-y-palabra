"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ListChecks } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Textarea, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

function contarPalabras(texto: string) {
  return texto.trim().length === 0 ? 0 : texto.trim().split(/\s+/).length;
}

export default function RedaccionChecklist({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: { texto_fuente: string | null; limite_palabras: number; checklist: string[] };
  respuestaPrevia?: { texto: string; checklist_marcado: boolean[] };
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(respuestaPrevia?.texto ?? "");
  const [marcado, setMarcado] = useState<boolean[]>(
    respuestaPrevia?.checklist_marcado ?? contenido.checklist.map(() => false),
  );
  const [cargando, setCargando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const palabras = contarPalabras(texto);
  const excedido = palabras > contenido.limite_palabras;

  function alternar(i: number) {
    setMarcado((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardado(false);
    setCargando(true);

    const supabase = createClient();
    const { error: upsertError } = await supabase.from("entregas").upsert(
      {
        estudiante_id: estudianteId,
        actividad_id: actividadId,
        respuesta: { texto, checklist_marcado: marcado },
        estado: "pendiente_revision",
      },
      { onConflict: "estudiante_id,actividad_id" },
    );

    if (upsertError) {
      setError(upsertError.message);
      setCargando(false);
      return;
    }

    setGuardado(true);
    setCargando(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {contenido.texto_fuente && (
        <div className="max-h-40 overflow-auto rounded-xl bg-slate-50 px-4 py-3.5 text-sm leading-relaxed text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
          {contenido.texto_fuente}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={6}
          placeholder="Escribe aquí"
        />
        <p
          className={`self-end text-xs font-medium ${
            excedido ? "text-red-600 dark:text-red-400" : "text-slate-400 dark:text-slate-500"
          }`}
        >
          {palabras} / {contenido.limite_palabras} palabras
        </p>
      </div>

      <div className="flex flex-col gap-2.5 rounded-xl border border-slate-200 px-4 py-3.5 dark:border-slate-800">
        <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-slate-50">
          <ListChecks className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          Antes de entregar, revisa
        </p>
        {contenido.checklist.map((punto, i) => (
          <label key={i} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={marcado[i]}
              onChange={() => alternar(i)}
              className="size-4 rounded border-slate-300 accent-indigo-600 dark:border-slate-600"
            />
            {punto}
          </label>
        ))}
      </div>

      {error && <ErrorText>{error}</ErrorText>}
      {guardado && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Guardado. Puedes seguir puliendo tu texto cuando quieras.
        </p>
      )}
      <Boton type="submit" cargando={cargando}>
        {cargando ? "Guardando..." : "Guardar mi texto"}
      </Boton>
    </form>
  );
}
