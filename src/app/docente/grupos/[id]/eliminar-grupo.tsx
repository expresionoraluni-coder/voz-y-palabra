"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/mensaje-error";
import { Card } from "@/components/ui/card";
import { Input, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

export default function EliminarGrupo({
  grupoId,
  nombreGrupo,
  totalEstudiantes,
}: {
  grupoId: string;
  nombreGrupo: string;
  totalEstudiantes: number;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [confirmacion, setConfirmacion] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function eliminar() {
    setCargando(true);
    setError(null);
    const supabase = createClient();
    const { error: delError } = await supabase.from("grupos").delete().eq("id", grupoId);
    if (delError) {
      setError(mensajeError(delError));
      setCargando(false);
      return;
    }
    router.push("/docente/dashboard");
    router.refresh();
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        Eliminar este grupo
      </button>
    );
  }

  return (
    <Card className="flex flex-col gap-3 border-red-200 p-5 dark:border-red-900">
      <p className="text-sm text-red-700 dark:text-red-400">
        Esto borra permanentemente el grupo <strong>{nombreGrupo}</strong>
        {totalEstudiantes > 0
          ? `, sus ${totalEstudiantes} estudiante(s) y todas sus entregas, reflexiones e insignias`
          : ""}
        . No se puede deshacer.
      </p>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Escribe <strong>{nombreGrupo}</strong> para confirmar
        </label>
        <Input value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} autoComplete="off" />
      </div>
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex gap-2">
        <Boton
          size="sm"
          variant="destructive"
          onClick={eliminar}
          cargando={cargando}
          disabled={confirmacion !== nombreGrupo}
        >
          {cargando ? "Eliminando..." : "Eliminar definitivamente"}
        </Boton>
        <Boton
          size="sm"
          variant="ghost"
          onClick={() => {
            setAbierto(false);
            setConfirmacion("");
          }}
        >
          Cancelar
        </Boton>
      </div>
    </Card>
  );
}
