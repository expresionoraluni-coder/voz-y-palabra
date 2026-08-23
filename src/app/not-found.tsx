import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
          <SearchX className="size-7" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Esta página no existe</h1>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">La dirección puede estar mal escrita o el recurso ya no estar disponible.</p>
        <Link href="/" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Ir a la portada
        </Link>
      </div>
    </main>
  );
}
