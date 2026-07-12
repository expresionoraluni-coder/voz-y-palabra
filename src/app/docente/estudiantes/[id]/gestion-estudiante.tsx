"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, UserCheck, UserX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Boton from "@/components/ui/button";
import { ErrorText } from "@/components/ui/field";

export default function GestionEstudiante({
  estudianteId,
  nombre,
  activo,
  grupoId,
}: {
  estudianteId: string;
  nombre: string;
  activo: boolean;
  grupoId: string;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState<"baja" | "eliminar" | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function darDeBaja() {
    setCargando(true);
    setError(null);
    const supabase = createClient();
    const { error: updError } = await supabase
      .from("estudiantes")
      .update({ activo: false })
      .eq("id", estudianteId);
    if (updError) {
      setError(updError.message);
      setCargando(false);
      return;
    }
    setConfirmando(null);
    setCargando(false);
    router.refresh();
  }

  async function reactivar() {
    setCargando(true);
    setError(null);
    const supabase = createClient();
    const { error: updError } = await supabase
      .from("estudiantes")
      .update({ activo: true })
      .eq("id", estudianteId);
    if (updError) {
      setError(updError.message);
      setCargando(false);
      return;
    }
    setCargando(false);
    router.refresh();
  }

  async function eliminar() {
    setCargando(true);
    setError(null);
    const supabase = createClient();
    const { error: delError } = await supabase.from("estudiantes").delete().eq("id", estudianteId);
    if (delError) {
      setError(delError.message);
      setCargando(false);
      return;
    }
    router.push(`/docente/grupos/${grupoId}`);
    router.refresh();
  }

  if (!activo) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        {error && <ErrorText>{error}</ErrorText>}
        <Boton size="sm" variant="secondary" onClick={reactivar} cargando={cargando}>
          <UserCheck className="size-4" aria-hidden="true" />
          Reactivar
        </Boton>
      </div>
    );
  }

  if (confirmando === "baja") {
    return (
      <div className="flex flex-col items-end gap-2">
        <p className="max-w-xs text-right text-xs text-slate-500 dark:text-slate-500">
          {nombre} ya no podrá entrar a la plataforma. Su historial se conserva y puedes reactivarla cuando
          quieras.
        </p>
        {error && <ErrorText>{error}</ErrorText>}
        <div className="flex gap-2">
          <Boton size="sm" variant="destructive" onClick={darDeBaja} cargando={cargando}>
            {cargando ? "Dando de baja..." : "Confirmar baja"}
          </Boton>
          <Boton size="sm" variant="ghost" onClick={() => setConfirmando(null)}>
            Cancelar
          </Boton>
        </div>
      </div>
    );
  }

  if (confirmando === "eliminar") {
    return (
      <div className="flex flex-col items-end gap-2">
        <p className="max-w-xs text-right text-xs text-red-600 dark:text-red-400">
          Esto borra permanentemente a {nombre} y todas sus entregas, reflexiones e insignias. No se puede
          deshacer.
        </p>
        {error && <ErrorText>{error}</ErrorText>}
        <div className="flex gap-2">
          <Boton size="sm" variant="destructive" onClick={eliminar} cargando={cargando}>
            {cargando ? "Eliminando..." : "Eliminar definitivamente"}
          </Boton>
          <Boton size="sm" variant="ghost" onClick={() => setConfirmando(null)}>
            Cancelar
          </Boton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={() => setConfirmando("baja")}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
      >
        <UserX className="size-4" aria-hidden="true" />
        Dar de baja
      </button>
      <button
        onClick={() => setConfirmando("eliminar")}
        className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        Eliminar
      </button>
    </div>
  );
}
