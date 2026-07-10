import {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  forwardRef,
  ReactNode,
} from "react";

const CAMPO_BASE =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:disabled:bg-slate-800";

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700 dark:text-slate-300">
      {children}
    </label>
  );
}

export function HelpText({ children }: { children: ReactNode }) {
  return <p className="text-xs text-slate-500 dark:text-slate-500">{children}</p>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <p className="text-sm text-red-600 dark:text-red-400">{children}</p>;
}

export function Field({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-1.5">{children}</div>;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input ref={ref} className={`${CAMPO_BASE} ${className}`} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className = "", ...props }, ref) => (
  <textarea ref={ref} className={`${CAMPO_BASE} resize-none ${className}`} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", ...props }, ref) => (
    <select ref={ref} className={`${CAMPO_BASE} ${className}`} {...props} />
  ),
);
Select.displayName = "Select";
