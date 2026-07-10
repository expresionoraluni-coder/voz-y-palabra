import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md";

const VARIANTES: Record<Variant, string> = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-300 dark:disabled:bg-indigo-900 dark:disabled:text-indigo-500",
  secondary:
    "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50 active:bg-slate-100 disabled:text-slate-400 disabled:bg-slate-50 dark:bg-slate-900 dark:text-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 dark:disabled:text-slate-600",
  ghost:
    "text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 disabled:text-slate-300 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50",
  destructive:
    "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-300 dark:disabled:bg-red-900 dark:disabled:text-red-500",
};

const TAMANOS: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
};

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  cargando?: boolean;
}

const Boton = forwardRef<HTMLButtonElement, BotonProps>(
  ({ variant = "primary", size = "md", cargando, disabled, className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || cargando}
        className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed ${VARIANTES[variant]} ${TAMANOS[size]} ${className}`}
        {...props}
      >
        {cargando && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  },
);
Boton.displayName = "Boton";

export default Boton;
