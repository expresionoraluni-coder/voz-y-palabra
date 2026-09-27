import { LucideIcon } from "lucide-react";

export default function MetricCard({
  etiqueta,
  valor,
  descripcion,
  icon: Icon,
  tono = "indigo",
}: {
  etiqueta: string;
  valor: string | number;
  descripcion?: string;
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
    <div className="relative flex flex-col gap-3 overflow-hidden rounded-[1.35rem] border border-slate-200/90 bg-white/90 p-4 shadow-[0_8px_26px_-18px_rgb(15_23_42/0.35)] backdrop-blur-sm dark:border-slate-800/90 dark:bg-slate-900/90">
      <div aria-hidden="true" className="absolute -right-6 -top-6 size-20 rounded-full bg-indigo-100/45 dark:bg-indigo-900/20" />
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{etiqueta}</p>
        {Icon && (
          <div className={`flex size-7 items-center justify-center rounded-lg ${tonos[tono]}`}>
            <Icon className="size-4" aria-hidden="true" />
          </div>
        )}
      </div>
      <p className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        {valor}
      </p>
      {descripcion && <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{descripcion}</p>}
    </div>
  );
}
