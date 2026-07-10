"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Field, Label, Input, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

export default function IngresoEstudiante() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const supabase = createClient();

    // Se valida contra el servidor (no solo lo guardado localmente): si la
    // sesión ya no existe de verdad (por ejemplo, quedó "fantasma" en el
    // navegador), esto lo detecta y crea una sesión nueva.
    const { data: usuario, error: usuarioError } = await supabase.auth.getUser();
    if (usuarioError || !usuario.user) {
      const { error: authError } = await supabase.auth.signInAnonymously();
      if (authError) {
        setError("No pudimos iniciar tu sesión, intenta de nuevo.");
        setCargando(false);
        return;
      }
    }

    let { error: rpcError } = await supabase.rpc("ingresar_estudiante", {
      p_codigo: codigo,
      p_nombre: nombre,
    });

    // Segundo intento de seguridad: si la sesión resultó inválida justo al
    // usarla, se descarta, se crea una nueva y se reintenta una sola vez.
    if (rpcError?.message.includes("foreign key constraint")) {
      await supabase.auth.signOut();
      const { error: retryAuthError } = await supabase.auth.signInAnonymously();
      if (!retryAuthError) {
        ({ error: rpcError } = await supabase.rpc("ingresar_estudiante", {
          p_codigo: codigo,
          p_nombre: nombre,
        }));
      }
    }

    if (rpcError) {
      setError(rpcError.message);
      setCargando(false);
      return;
    }

    router.push("/estudiante/inicio");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-6 px-6">
      <Link
        href="/ingreso"
        className="fixed left-6 top-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver
      </Link>

      <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
        <GraduationCap className="size-6" aria-hidden="true" />
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Entrar como estudiante
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
          Sin correo, sin contraseña — solo tu nombre y el código de tu grupo
        </p>
      </div>

      <Card className="w-full max-w-sm p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <Label htmlFor="codigo">Código de grupo</Label>
            <Input
              id="codigo"
              required
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ej. 1IM4-2026"
              autoComplete="off"
            />
          </Field>
          <Field>
            <Label htmlFor="nombre">Tu nombre (como lo escribió tu profesora)</Label>
            <Input
              id="nombre"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Ana Torres"
              autoComplete="off"
            />
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          <Boton type="submit" cargando={cargando} className="w-full">
            {cargando ? "Entrando..." : "Entrar"}
          </Boton>
        </form>
      </Card>
    </div>
  );
}
