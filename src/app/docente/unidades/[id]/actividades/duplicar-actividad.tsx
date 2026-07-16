"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function DuplicarActividad({
  actividadId,
  unidadId,
  titulo,
}: {
  actividadId: string;
  unidadId: string;
  titulo: string;
}) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  async function duplicar() {
    setCargando(true);
    const supabase = createClient();

    const { data: original, error: fetchError } = await supabase
      .from("actividades")
      .select("tipo_id, titulo, instrucciones, contenido")
      .eq("id", actividadId)
      .single();
    if (fetchError || !original) {
      setCargando(false);
      return;
    }

    const { count } = await supabase
      .from("actividades")
      .select("id", { count: "exact", head: true })
      .eq("unidad_id", unidadId);

    // Reutiliza el contenido tal cual (mismas opciones/categorías/rúbrica,
    // etc.) — la docente lo abre ya en modo edición para ajustar lo que
    // cambie, en vez de volver a escribir una estructura casi idéntica.
    const { data: nueva, error: insertError } = await supabase
      .from("actividades")
      .insert({
        unidad_id: unidadId,
        tipo_id: original.tipo_id,
        titulo: `${original.titulo} (copia)`,
        instrucciones: original.instrucciones,
        contenido: original.contenido,
        orden: (count ?? 0) + 1,
      })
      .select("id")
      .single();

    if (insertError || !nueva) {
      setCargando(false);
      return;
    }

    router.push(`/docente/unidades/${unidadId}/actividades/${nueva.id}/editar`);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={duplicar}
      disabled={cargando}
      aria-label={`Duplicar "${titulo}"`}
      title="Duplicar actividad"
      className="shrink-0 rounded-lg p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
    >
      {cargando ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Copy className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}
