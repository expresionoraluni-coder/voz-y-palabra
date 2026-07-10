"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generarCodigoAcceso } from "@/lib/codigo-acceso";

export default function NuevoGrupo() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [cicloEscolar, setCicloEscolar] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Tu sesión expiró, vuelve a entrar.");
      setCargando(false);
      return;
    }

    const codigo_acceso = generarCodigoAcceso(nombre);

    const { data, error: insertError } = await supabase
      .from("grupos")
      .insert({
        nombre,
        codigo_acceso,
        ciclo_escolar: cicloEscolar || null,
        docente_id: user.id,
      })
      .select()
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? "No pudimos crear el grupo.");
      setCargando(false);
      return;
    }

    router.push(`/docente/grupos/${data.id}`);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 dark:bg-black">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Crear grupo
      </h1>
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">
            Nombre del grupo
          </label>
          <input
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. 1IM4"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">
            Ciclo escolar (opcional)
          </label>
          <input
            value={cicloEscolar}
            onChange={(e) => setCicloEscolar(e.target.value)}
            placeholder="Ej. 2026-A"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={cargando}
          className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {cargando ? "Creando..." : "Crear grupo"}
        </button>
      </form>
    </div>
  );
}
