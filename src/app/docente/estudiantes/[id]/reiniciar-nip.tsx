"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Boton from "@/components/ui/button";
import { ErrorText } from "@/components/ui/field";

export default function ReiniciarNip({ estudianteId, nombre }: { estudianteId: string; nombre: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState(false);

  async function reiniciar() {
    setCargando(true);
    setError(null);

    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("reiniciar_nip_estudiante", {
      p_estudiante_id: estudianteId,
    });

    if (rpcError) {
      setError(rpcError.message);
      setCargando(false);
      return;
    }

    setHecho(true);
    setCargando(false);
    router.refresh();
  }

  if (hecho) {
    return (
      <p className="text-sm text-emerald-600 dark:text-emerald-400">
        NIP reiniciado. {nombre.split(" ")[0]} podrá crear uno nuevo la próxima vez que entre.
      </p>
    );
  }

  if (!confirmando) {
    return (
      <button
        onClick={() => setConfirmando(true)}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
      >
        <KeyRound className="size-4" aria-hidden="true" />
        Reiniciar NIP
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
      <p className="text-sm text-slate-700 dark:text-slate-300">
        ¿Reiniciar el NIP de {nombre}? Su sesión actual se cerrará y podrá crear un NIP nuevo la próxima
        vez que entre con su nombre.
      </p>
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex gap-2">
        <Boton size="sm" variant="destructive" onClick={reiniciar} cargando={cargando}>
          {cargando ? "Reiniciando..." : "Sí, reiniciar"}
        </Boton>
        <Boton size="sm" variant="ghost" onClick={() => setConfirmando(false)}>
          Cancelar
        </Boton>
      </div>
    </div>
  );
}
