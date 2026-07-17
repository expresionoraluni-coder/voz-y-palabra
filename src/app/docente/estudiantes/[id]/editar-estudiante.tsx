"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/mensaje-error";
import { normalizarNombre } from "@/lib/normalizar-nombre";
import { Field, Label, Input, ErrorText, HelpText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

export default function EditarEstudiante({
  estudianteId,
  nombreActual,
  boletaActual,
}: {
  estudianteId: string;
  nombreActual: string;
  boletaActual: string | null;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(nombreActual);
  const [boleta, setBoleta] = useState(boletaActual ?? "");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cancelar() {
    setAbierto(false);
    setNombre(nombreActual);
    setBoleta(boletaActual ?? "");
    setError(null);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError("El nombre no puede quedar vacío.");
      return;
    }

    setCargando(true);
    const supabase = createClient();
    const { error: updError } = await supabase
      .from("estudiantes")
      .update({ nombre: normalizarNombre(nombre), boleta: boleta.trim() || null })
      .eq("id", estudianteId);

    if (updError) {
      setError(mensajeError(updError));
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
        <Label htmlFor="edit-nombre">Nombre</Label>
        <Input
          id="edit-nombre"
          required
          value={nombre}
          onChange={(e) => setNombre(normalizarNombre(e.target.value))}
        />
        <HelpText>Se guarda en mayúsculas y sin acentos — es el nombre con el que entra.</HelpText>
      </Field>
      <Field>
        <Label htmlFor="edit-boleta">Boleta</Label>
        <Input
          id="edit-boleta"
          value={boleta}
          onChange={(e) => setBoleta(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
        />
        <HelpText>Corregir la boleta no cambia el NIP que el estudiante ya tiene guardado.</HelpText>
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
