import type { ReactNode } from "react";

export default function MomentoActividad({
  numero,
  titulo,
  instruccion,
  children,
}: {
  numero: number;
  titulo: string;
  instruccion: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`momento-${numero}-titulo`}
      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          {numero}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
            Momento {numero}
          </p>
          <h2 id={`momento-${numero}-titulo`} className="text-base font-semibold text-slate-900 dark:text-slate-50">
            {titulo}
          </h2>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{instruccion}</p>
      {children}
    </section>
  );
}

