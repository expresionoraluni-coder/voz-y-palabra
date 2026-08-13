import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFoundEstudiante() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <SearchX className="size-6" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            No encontramos esa actividad
          </h1>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Puede que haya sido retirada o que el enlace ya no esté disponible.
          </p>
        </div>
        <Link
          href="/estudiante/inicio"
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
