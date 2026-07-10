import { HTMLAttributes } from "react";

type Tono = "neutral" | "indigo" | "success" | "warning" | "error";

const TONOS: Record<Tono, string> = {
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  warning: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  error: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tono?: Tono;
}

export default function Badge({ tono = "neutral", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${TONOS[tono]} ${className}`}
      {...props}
    />
  );
}
