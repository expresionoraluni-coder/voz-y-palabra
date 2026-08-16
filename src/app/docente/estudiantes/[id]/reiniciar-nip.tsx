"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mensajeErrorRpc } from "@/lib/mensaje-error";
import Boton from "@/components/ui/button";
import { ErrorText } from "@/components/ui/field";

export default function ReiniciarNip({ estudianteId, nombre }: { estudianteId: string; nombre: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nipTemporal, setNipTemporal] = useState<string | null>(null);
  const hecho = Boolean(nipTemporal);

  async function reiniciar() {
    if (cargando) return;
    setCargando(true);
    setError(null);

    const supabase = createClient();
    const { data: nipTemporal, error: rpcError } = await supabase.rpc("reiniciar_nip_estudiante", {
      p_estudiante_id: estudianteId,
    });

    if (rpcError) {
      setError(mensajeErrorRpc(rpcError, [
        { contiene: "No tienes permiso sobre este estudiante", mensaje: "No tienes permiso sobre este estudiante." },
        { contiene: "No encontramos este estudiante", mensaje: "No encontramos este estudiante en el grupo." },
        { contiene: "Sesión inválida", mensaje: "Tu sesión expiró. Entra de nuevo para continuar." },
      ]));
      setCargando(false);
      return;
    }

    if (typeof nipTemporal !== "string" || !/^\d{4}$/.test(nipTemporal)) {
      setError("No recibimos un NIP temporal válido. Intenta de nuevo.");
      setCargando(false);
      return;
    }
    setNipTemporal(nipTemporal);
    setCargando(false);
    router.refresh();
  }

  if (hecho) {
    return (
      <div className="flex flex-col gap-1 text-sm text-emerald-600 dark:text-emerald-400">
        <p>NIP temporal para {nombre.split(" ")[0]}: <strong>{nipTemporal}</strong></p>
        <p>Compártelo de forma privada. Al entrar, tendrá que cambiarlo por uno propio.</p>
      </div>
    );
  }

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-500 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:text-slate-50"
      >
        <KeyRound className="size-4" aria-hidden="true" />
        Reiniciar NIP
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
      <p className="text-sm text-slate-700 dark:text-slate-300">
        ¿Reiniciar el NIP de {nombre}? Su sesión actual se cerrará y recibirá un NIP temporal para entrar.
        Después tendrá que cambiarlo por uno propio.
      </p>
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex gap-2">
        <Boton size="sm" variant="destructive" onClick={reiniciar} cargando={cargando}>
          {cargando ? "Reiniciando…" : "Sí, reiniciar"}
        </Boton>
        <Boton size="sm" variant="ghost" onClick={() => setConfirmando(false)}>
          Cancelar
        </Boton>
      </div>
    </div>
  );
}
