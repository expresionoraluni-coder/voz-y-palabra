"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import Boton from "@/components/ui/button";

export default function ErrorDocente({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-10">
      <div
        role="alert"
        className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/40"
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            No pudimos cargar el panel
          </h1>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Puede ser una conexión momentánea. Intenta de nuevo o vuelve al inicio del panel.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Boton type="button" onClick={() => retry()} size="sm">
            <RefreshCw className="size-4" aria-hidden="true" />
            Intentar de nuevo
          </Boton>
          <Link
            href="/docente/dashboard"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Ir al panel
          </Link>
        </div>
      </div>
    </main>
  );
}

