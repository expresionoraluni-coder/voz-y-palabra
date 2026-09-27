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
      className="relative flex flex-col gap-4 overflow-hidden rounded-[1.5rem] border border-slate-200/90 bg-white/90 p-5 shadow-[0_12px_28px_-22px_rgb(15_23_42/0.4)] backdrop-blur-sm dark:border-slate-800/90 dark:bg-slate-900/90 sm:p-6"
    >
      <div aria-hidden="true" className="absolute -right-8 -top-8 size-24 rounded-full bg-indigo-100/70 dark:bg-indigo-900/25" />
      <div className="relative flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-bold text-white shadow-md shadow-indigo-600/25">
          {numero}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-600 dark:text-indigo-400">
            Momento {numero}
          </p>
          <h2 id={`momento-${numero}-titulo`} className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-50">
            {titulo}
          </h2>
        </div>
      </div>
      <p className="relative text-sm leading-relaxed text-slate-600 dark:text-slate-300">{instruccion}</p>
      {children}
    </section>
  );
}
