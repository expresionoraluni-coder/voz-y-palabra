import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReactNode } from "react";

export default function PageHeader({
  volverHref,
  volverTexto = "Volver",
  eyebrow,
  titulo,
  descripcion,
  accion,
}: {
  volverHref?: string;
  volverTexto?: string;
  eyebrow?: string;
  titulo: ReactNode;
  descripcion?: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      {volverHref && (
        <Link
          href={volverHref}
          className="inline-flex min-h-10 w-fit touch-manipulation items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/60 px-3 text-sm font-medium text-slate-600 shadow-sm backdrop-blur-sm transition-[color,background-color,transform] hover:-translate-y-0.5 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800/80 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-50"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {volverTexto}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          {eyebrow && (
            <p className="w-fit rounded-full bg-indigo-100/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
              {eyebrow}
            </p>
          )}
          <h1 className="text-3xl font-bold leading-[1.08] tracking-tight text-slate-900 sm:text-[2rem] dark:text-slate-50">
            {titulo}
          </h1>
          {descripcion && (
            <p className="max-w-prose text-sm leading-relaxed text-slate-600 dark:text-slate-400">{descripcion}</p>
          )}
        </div>
        {accion}
      </div>
    </div>
  );
}
