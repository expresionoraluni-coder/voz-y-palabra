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
    <div className="flex flex-col gap-3">
      {volverHref && (
        <Link
          href={volverHref}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:text-slate-50"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {volverTexto}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            {titulo}
          </h1>
          {descripcion && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{descripcion}</p>
          )}
        </div>
        {accion}
      </div>
    </div>
  );
}
