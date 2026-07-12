"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, NotebookPen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Textarea, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

export default function Bitacora({
  estudianteId,
  unidadId,
  metaPrevia,
  cumplidaPrevia,
  avancePct,
}: {
  estudianteId: string;
  unidadId: string;
  metaPrevia: string | null;
  cumplidaPrevia: boolean;
  avancePct: number;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(!metaPrevia);
  const [meta, setMeta] = useState(metaPrevia ?? "");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardarMeta(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    const supabase = createClient();
    const { error: upsertError } = await supabase.from("bitacora").upsert(
      { estudiante_id: estudianteId, unidad_id: unidadId, meta, cumplida: false },
      { onConflict: "estudiante_id,unidad_id" },
    );
    if (upsertError) {
      setError(upsertError.message);
      setCargando(false);
      return;
    }
    setCargando(false);
    setEditando(false);
    router.refresh();
  }

  async function alternarCumplida() {
    setCargando(true);
    const supabase = createClient();
    await supabase
      .from("bitacora")
      .update({ cumplida: !cumplidaPrevia })
      .eq("estudiante_id", estudianteId)
      .eq("unidad_id", unidadId);
    setCargando(false);
    router.refresh();
  }

  if (editando) {
    return (
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <NotebookPen className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
            ¿Cuál es tu meta para esta unidad?
          </p>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Algo concreto y medible — no "esforzarme más", sino algo que puedas revisar al final.
        </p>
        <form onSubmit={guardarMeta} className="flex flex-col gap-3">
          <Textarea
            required
            value={meta}
            onChange={(e) => setMeta(e.target.value)}
            rows={2}
            placeholder='Ej. "Terminar la unidad y bajar mis muletillas a menos de 3 por texto"'
          />
          {error && <ErrorText>{error}</ErrorText>}
          <div className="flex gap-2">
            <Boton type="submit" size="sm" cargando={cargando} disabled={!meta.trim()} className="self-start">
              {cargando ? "Guardando..." : "Guardar meta"}
            </Boton>
            {metaPrevia && (
              <Boton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setEditando(false)}
                className="self-start"
              >
                Cancelar
              </Boton>
            )}
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <NotebookPen className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Tu meta para esta unidad</p>
      </div>
      <p className="text-sm italic text-slate-700 dark:text-slate-300">"{metaPrevia}"</p>
      <p className="text-xs text-slate-500 dark:text-slate-500">Progreso de la unidad: {avancePct}%</p>
      <div className="flex flex-wrap gap-2">
        <Boton
          type="button"
          variant={cumplidaPrevia ? "secondary" : "primary"}
          size="sm"
          onClick={alternarCumplida}
          cargando={cargando}
          className="self-start"
        >
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          {cumplidaPrevia ? "Cumplida" : "Marcar como cumplida"}
        </Boton>
        <Boton type="button" variant="secondary" size="sm" onClick={() => setEditando(true)} className="self-start">
          Cambiar meta
        </Boton>
      </div>
    </Card>
  );
}
