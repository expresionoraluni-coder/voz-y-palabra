"use client";

export default function BotonImprimir() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-50"
    >
      Descargar / imprimir
    </button>
  );
}
