"use client";

import { useState } from "react";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Field, Label, Input, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

function CampoNip({
  id,
  etiqueta,
  valor,
  onChange,
  visible,
  onToggleVisible,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
}) {
  return (
    <Field>
      <Label htmlFor={id}>{etiqueta}</Label>
      <div className="relative">
        <Input
          id={id}
          required
          type={visible ? "text" : "password"}
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          value={valor}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="••••"
          autoComplete="off"
          className="pr-11"
        />
        <button
          type="button"
          onClick={onToggleVisible}
          aria-label={visible ? "Ocultar" : "Mostrar"}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:text-slate-200"
        >
          {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      </div>
    </Field>
  );
}

export default function CambiarNip() {
  const [abierto, setAbierto] = useState(false);
  const [nipActual, setNipActual] = useState("");
  const [nipNuevo, setNipNuevo] = useState("");
  const [nipNuevoConfirmar, setNipNuevoConfirmar] = useState("");
  const [visible, setVisible] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState(false);

  function cerrar() {
    setAbierto(false);
    setNipActual("");
    setNipNuevo("");
    setNipNuevoConfirmar("");
    setError(null);
    setHecho(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (nipNuevo !== nipNuevoConfirmar) {
      setError("Los dos NIP nuevos no coinciden — revísalos.");
      return;
    }
    if (nipNuevo === nipActual) {
      setError("Tu NIP nuevo debe ser distinto al actual.");
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
    // "NIP actual incorrecto" y "ya bloqueado" llegan como dato, no como
    // rpcError, por la misma razón que en ingresar_estudiante: así el
    // contador de intentos fallidos sí queda guardado.
    if (mensajeError) {
      setError(mensajeError);
      setCargando(false);
      return;
    }

    setHecho(true);
    setCargando(false);
    setNipActual("");
    setNipNuevo("");
    setNipNuevoConfirmar("");
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
      >
        <KeyRound className="size-4" aria-hidden="true" />
        Cambiar mi NIP
      </button>
    );
  }

  if (hecho) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
        <span>Tu NIP quedó cambiado. Úsalo la próxima vez que entres.</span>
        <button onClick={cerrar} className="shrink-0 font-medium underline underline-offset-2">
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/60"
    >
      <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-slate-50">
        <KeyRound className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        Cambiar mi NIP
      </p>
      <CampoNip id="nip-actual" etiqueta="Tu NIP actual" valor={nipActual} onChange={setNipActual} visible={visible} onToggleVisible={() => setVisible((v) => !v)} />
      <CampoNip id="nip-nuevo" etiqueta="Tu NIP nuevo" valor={nipNuevo} onChange={setNipNuevo} visible={visible} onToggleVisible={() => setVisible((v) => !v)} />
      <CampoNip id="nip-nuevo-confirmar" etiqueta="Confirma tu NIP nuevo" valor={nipNuevoConfirmar} onChange={setNipNuevoConfirmar} visible={visible} onToggleVisible={() => setVisible((v) => !v)} />
      {nipNuevoConfirmar.length === 4 && nipNuevoConfirmar !== nipNuevo && (
        <ErrorText>No coincide con el NIP nuevo de arriba.</ErrorText>
      )}
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex gap-2">
        <Boton
          type="submit"
          size="sm"
          cargando={cargando}
          disabled={nipNuevo.length === 4 && nipNuevo !== nipNuevoConfirmar}
        >
          {cargando ? "Guardando..." : "Guardar NIP nuevo"}
        </Boton>
        <Boton type="button" variant="ghost" size="sm" onClick={cerrar}>
          Cancelar
        </Boton>
      </div>
    </form>
  );
}
