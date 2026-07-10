import { LucideIcon } from "lucide-react";

export default function MetricCard({
  etiqueta,
  valor,
  icon: Icon,
  tono = "indigo",
}: {
  etiqueta: string;
  valor: string | number;
  icon?: LucideIcon;
  tono?: "indigo" | "amber" | "emerald" | "slate";
}) {
  const tonos = {
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-500">{etiqueta}</p>
        {Icon && (
          <div className={`flex size-7 items-center justify-center rounded-lg ${tonos[tono]}`}>
            <Icon className="size-4" aria-hidden="true" />
          </div>
        )}
      </div>
      <p className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        {valor}
      </p>
    </div>
  );
}
