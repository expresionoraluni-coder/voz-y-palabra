import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

export default function EmptyState({
  icon: Icon,
  titulo,
  descripcion,
  accion,
}: {
  icon: LucideIcon;
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-700">
      <div className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{titulo}</p>
        {descripcion && (
          <p className="text-sm text-slate-500 dark:text-slate-500">{descripcion}</p>
        )}
      </div>
      {accion}
    </div>
  );
}
