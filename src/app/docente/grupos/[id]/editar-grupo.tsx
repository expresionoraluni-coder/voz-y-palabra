"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/mensaje-error";
import { Field, Label, Input, ErrorText, HelpText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

export default function EditarGrupo({
  grupoId,
  nombreActual,
  codigoActual,
}: {
  grupoId: string;
  nombreActual: string;
  codigoActual: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(nombreActual);
  const [codigo, setCodigo] = useState(codigoActual);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cancelar() {
    setAbierto(false);
    setNombre(nombreActual);
    setCodigo(codigoActual);
    setError(null);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nombre.trim() || !codigo.trim()) {
      setError("El nombre y el código no pueden quedar vacíos.");
      return;
    }

    setCargando(true);
    const supabase = createClient();
    const { error: updError } = await supabase
      .from("grupos")
      .update({ nombre: nombre.trim(), codigo_acceso: codigo.trim().toUpperCase() })
      .eq("id", grupoId);

    if (updError) {
      setError(mensajeError(updError, { "23505": "Ese código de grupo ya existe, prueba con otro." }));
      setCargando(false);
      return;
    }

    setAbierto(false);
    setCargando(false);
    router.refresh();
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
      >
        <Pencil className="size-4" aria-hidden="true" />
        Editar
      </button>
    );
  }

  return (
    <form
      onSubmit={guardar}
      className="flex w-full max-w-xs flex-col gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 dark:border-slate-800 dark:bg-slate-900/60"
    >
      <Field>
        <Label htmlFor="grupo-nombre">Nombre del grupo</Label>
        <Input id="grupo-nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </Field>
      <Field>
        <Label htmlFor="grupo-codigo">Código de acceso</Label>
        <Input
          id="grupo-codigo"
          required
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          className="font-mono"
        />
        <HelpText>
          Si lo cambias, tus estudiantes van a necesitar el código nuevo para entrar por primera vez
          desde un dispositivo nuevo — los que ya iniciaron sesión no se ven afectados.
        </HelpText>
      </Field>
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex gap-2">
        <Boton type="submit" size="sm" cargando={cargando}>
          {cargando ? "Guardando..." : "Guardar"}
        </Boton>
        <Boton type="button" variant="ghost" size="sm" onClick={cancelar}>
          Cancelar
        </Boton>
      </div>
    </form>
  );
}
