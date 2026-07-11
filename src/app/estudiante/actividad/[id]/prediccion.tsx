"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Target } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Textarea, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

export default function Prediccion({
  actividadId,
  estudianteId,
}: {
  actividadId: string;
  estudianteId: string;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const supabase = createClient();
    const { error: upsertError } = await supabase.from("reflexiones").upsert(
      {
        estudiante_id: estudianteId,
        actividad_id: actividadId,
        momento: "prediccion",
        texto,
      },
      { onConflict: "estudiante_id,actividad_id,momento" },
    );

    if (upsertError) {
      setError(upsertError.message);
      setCargando(false);
      return;
    }

    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 dark:border-indigo-900 dark:bg-indigo-950/40"
    >
      <div className="flex items-center gap-2">
        <Target className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
          Antes de empezar: ¿qué crees que se te va a dificultar más de esta actividad?
        </p>
      </div>
      <Textarea
        required
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={2}
        placeholder="Una idea breve — al final vamos a ver si acertaste"
        className="bg-white dark:bg-slate-950"
      />
      {error && <ErrorText>{error}</ErrorText>}
      <Boton type="submit" size="sm" disabled={!texto.trim()} cargando={cargando} className="self-start">
        {cargando ? "Guardando..." : "Empezar la actividad"}
      </Boton>
    </form>
  );
}
