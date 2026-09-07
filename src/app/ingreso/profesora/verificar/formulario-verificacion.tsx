"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/mensaje-error";
import { Card } from "@/components/ui/card";
import { Field, Label, Input, ErrorText, HelpText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

export default function FormularioVerificacionDocente() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cargando) return;
    setError(null);
    setCargando(true);
    const supabase = createClient();
    const { data: mensajeRpc, error: rpcError } = await supabase.rpc("completar_perfil_docente", {
      p_nombre: nombre.trim(),
    });
    if (rpcError) {
      setError(mensajeError(rpcError, {
        "42501": "No pudimos comprobar la autorización de esta cuenta. Inicia el registro de nuevo.",
      }));
      setCargando(false);
      return;
    }
    if (mensajeRpc) {
      setError(mensajeRpc);
      setCargando(false);
      return;
    }
    router.replace("/docente/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-6 px-6 py-10">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
        <KeyRound className="size-6" aria-hidden="true" />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Completa tu perfil docente</h1>
        <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Tu correo y tu invitación ya quedaron confirmados. Solo falta el nombre que aparecerá en tu panel.
        </p>
      </div>
      <Card className="w-full max-w-sm p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <Label htmlFor="nombre">Nombre para mostrar</Label>
            <Input id="nombre" required maxLength={200} value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" autoFocus />
            <HelpText>Escribe el nombre con el que quieres identificar tu panel.</HelpText>
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          <Boton type="submit" cargando={cargando} disabled={!nombre.trim()} className="w-full">
            {cargando ? "Guardando…" : "Entrar al panel"}
          </Boton>
        </form>
      </Card>
    </main>
  );
}
