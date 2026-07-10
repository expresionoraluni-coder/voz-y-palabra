"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Aviso = { id: string; titulo: string; mensaje: string; created_at: string };

export default function Avisos({
  grupoId,
  avisos,
}: {
  grupoId: string;
  avisos: Aviso[];
}) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [mensaje, setMensaje] = useState("");
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
      setError("Tu sesión expiró.");
      setCargando(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("avisos")
      .insert({ docente_id: user.id, grupo_id: grupoId, titulo, mensaje });
    if (insertError) {
      setError(insertError.message);
      setCargando(false);
      return;
    }

    setTitulo("");
    setMensaje("");
    setCargando(false);
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Avisos</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          required
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <textarea
          required
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          rows={2}
          placeholder="Mensaje"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={cargando}
          className="self-start rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {cargando ? "Publicando..." : "Publicar aviso"}
        </button>
      </form>
      {avisos.length > 0 && (
        <ul className="flex flex-col gap-2">
          {avisos.map((a) => (
            <li key={a.id} className="rounded-lg border border-zinc-200 px-4 py-2 dark:border-zinc-800">
              <p className="font-medium text-zinc-900 dark:text-zinc-50">{a.titulo}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{a.mensaje}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
