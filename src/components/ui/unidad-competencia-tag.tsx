import { Target } from "lucide-react";

export default function UnidadCompetenciaTag({
  texto,
  compacto = false,
}: {
  texto: string;
  compacto?: boolean;
}) {
  if (compacto) {
    return (
      <p className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-500">
        <Target className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
        <span>
          <span className="font-medium text-slate-600 dark:text-slate-400">Unidad de competencia: </span>
          {texto}
        </span>
      </p>
    );
  }

  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/60">
      <Target className="mt-0.5 size-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
          Unidad de competencia (lo que vas a dominar al terminar esta unidad)
        </p>
        <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">{texto}</p>
      </div>
    </div>
  );
}
