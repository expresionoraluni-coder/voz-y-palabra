"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AgregarEstudiantes({ grupoId }: { grupoId: string }) {
  const router = useRouter();
  const [nombres, setNombres] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agregados, setAgregados] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAgregados(null);

    const lista = nombres
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (lista.length === 0) return;

    setCargando(true);
    const supabase = createClient();

    const { data, error: insertError } = await supabase
      .from("estudiantes")
      .insert(lista.map((nombre) => ({ nombre, grupo_id: grupoId })))
      .select();

    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "Uno o más nombres ya están en este grupo (no se permiten nombres repetidos)."
          : insertError.message,
      );
      setCargando(false);
      return;
    }

    setAgregados(data?.length ?? 0);
    setNombres("");
    setCargando(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label className="text-sm text-zinc-600 dark:text-zinc-400">
        Agregar estudiantes (un nombre por línea — puedes pegar una columna
        completa desde Excel)
      </label>
      <textarea
        value={nombres}
        onChange={(e) => setNombres(e.target.value)}
        rows={5}
        placeholder={"Ana Torres\nLuis Martínez\nSofía Ramírez"}
        className="rounded-lg border border-zinc-300 px-4 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {agregados !== null && (
        <p className="text-sm text-green-600 dark:text-green-400">
          {agregados} estudiante(s) agregado(s).
        </p>
      )}
      <button
        type="submit"
        disabled={cargando}
        className="self-start rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {cargando ? "Agregando..." : "Agregar"}
      </button>
    </form>
  );
}
