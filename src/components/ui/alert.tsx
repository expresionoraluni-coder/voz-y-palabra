import { AlertTriangle, CheckCircle2, Info, LucideIcon } from "lucide-react";
import { ReactNode } from "react";

type Tono = "warning" | "success" | "info" | "error";

const CONFIG: Record<Tono, { icon: LucideIcon; className: string; iconClassName: string }> = {
  warning: {
    icon: AlertTriangle,
    className: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950",
    iconClassName: "text-amber-600 dark:text-amber-400",
  },
  success: {
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950",
    iconClassName: "text-emerald-600 dark:text-emerald-400",
  },
  info: {
    icon: Info,
    className: "border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950",
    iconClassName: "text-indigo-600 dark:text-indigo-400",
  },
  error: {
    icon: AlertTriangle,
    className: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950",
    iconClassName: "text-red-600 dark:text-red-400",
  },
};

export default function Alert({
  tono = "info",
  titulo,
  children,
}: {
  tono?: Tono;
  titulo?: string;
  children: ReactNode;
}) {
  const { icon: Icon, className, iconClassName } = CONFIG[tono];
  return (
    <div className={`flex gap-3 rounded-xl border px-4 py-3 ${className}`}>
      <Icon className={`mt-0.5 size-4 shrink-0 ${iconClassName}`} aria-hidden="true" />
      <div className="flex flex-col gap-1 text-sm">
        {titulo && <p className="font-medium text-slate-900 dark:text-slate-50">{titulo}</p>}
        <div className="text-slate-700 dark:text-slate-300">{children}</div>
      </div>
    </div>
  );
}
