"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { ErrorText } from "@/components/ui/field";
import CampoNip from "@/components/ui/campo-nip";
import Boton from "@/components/ui/button";

/**
 * Se muestra en vez de todo el contenido del hub (ver layout.tsx) cuando
 * estudiantes.debe_cambiar_nip es true: el NIP con el que entró es un dato
 * conocible (últimos dígitos de su boleta), no un secreto que haya elegido
 * él mismo. No tiene opción de "cancelar" ni "más tarde" a propósito.
 */
export default function CambiarNipObligatorio() {
  const router = useRouter();
  const [nipActual, setNipActual] = useState("");
  const [nipNuevo, setNipNuevo] = useState("");
  const [nipNuevoConfirmar, setNipNuevoConfirmar] = useState("");
  const [visible, setVisible] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (nipNuevo !== nipNuevoConfirmar) {
      setError("Los dos NIP nuevos no coinciden — revísalos.");
      return;
    }
    if (nipNuevo === nipActual) {
      setError("Tu NIP nuevo debe ser distinto al de tu boleta.");
      return;
    }

    setCargando(true);
    const supabase = createClient();
    const { data: mensajeError, error: rpcError } = await supabase.rpc("cambiar_nip_estudiante", {
      p_nip_actual: nipActual,
      p_nip_nuevo: nipNuevo,
    });

    if (rpcError) {
      setError(rpcError.message);
      setCargando(false);
      return;
    }
    if (mensajeError) {
      setError(mensajeError);
      setCargando(false);
      return;
    }

    // El layout vuelve a consultar debe_cambiar_nip en el servidor; ya en
    // false, deja pasar al contenido normal del hub.
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-6 px-6 py-10">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
        <ShieldAlert className="size-6" aria-hidden="true" />
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Antes de continuar, cambia tu NIP
        </h1>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-500">
          Entraste con el NIP que te asignamos desde tu boleta escolar — un compañero podría
          conocerlo. Cámbialo por uno que solo tú sepas.
        </p>
      </div>

      <Card className="w-full max-w-sm p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-slate-50">
            <KeyRound className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            Cambiar mi NIP
          </p>
          <CampoNip
            id="nip-actual"
            etiqueta="Tu NIP actual (los últimos 4 dígitos de tu boleta)"
            valor={nipActual}
            onChange={setNipActual}
            visible={visible}
            onToggleVisible={() => setVisible((v) => !v)}
          />
          <CampoNip
            id="nip-nuevo"
            etiqueta="Tu NIP nuevo"
            valor={nipNuevo}
            onChange={setNipNuevo}
            visible={visible}
            onToggleVisible={() => setVisible((v) => !v)}
          />
          <CampoNip
            id="nip-nuevo-confirmar"
            etiqueta="Confirma tu NIP nuevo"
            valor={nipNuevoConfirmar}
            onChange={setNipNuevoConfirmar}
            visible={visible}
            onToggleVisible={() => setVisible((v) => !v)}
          />
          {nipNuevoConfirmar.length === 4 && nipNuevoConfirmar !== nipNuevo && (
            <ErrorText>No coincide con el NIP nuevo de arriba.</ErrorText>
          )}
          {error && <ErrorText>{error}</ErrorText>}
          <Boton
            type="submit"
            cargando={cargando}
            disabled={nipNuevo.length === 4 && nipNuevo !== nipNuevoConfirmar}
            className="w-full"
          >
            {cargando ? "Guardando..." : "Guardar y continuar"}
          </Boton>
        </form>
      </Card>
    </div>
  );
}
