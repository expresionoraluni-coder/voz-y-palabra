"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

    const { data: sesion } = await supabase.auth.getSession();
    if (!sesion.session) {
      const { error: authError } = await supabase.auth.signInAnonymously();
      if (authError) {
        setError("No pudimos iniciar tu sesión, intenta de nuevo.");
        setCargando(false);
        return;
      }
    }

    const { error: rpcError } = await supabase.rpc("ingresar_estudiante", {
      p_codigo: codigo,
      p_nombre: nombre,
    });

    if (rpcError) {
      setError(rpcError.message);
      setCargando(false);
      return;
    }

    router.push("/estudiante/inicio");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 dark:bg-black">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Entrar como estudiante
      </h1>
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">
            Código de grupo
          </label>
          <input
            required
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            placeholder="Ej. 1IM4-2026"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">
            Tu nombre (como lo escribió tu profesora)
          </label>
          <input
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            placeholder="Ej. Ana Torres"
          />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={cargando}
          className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {cargando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
