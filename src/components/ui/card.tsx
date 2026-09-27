import { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-[1.35rem] border border-slate-200/90 bg-white/90 shadow-[0_8px_26px_-18px_rgb(15_23_42/0.35)] backdrop-blur-sm dark:border-slate-800/90 dark:bg-slate-900/90 ${className}`}
      {...props}
    />
  );
}

export function CardLink({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-[1.35rem] border border-slate-200/90 bg-white/90 shadow-[0_8px_26px_-18px_rgb(15_23_42/0.35)] backdrop-blur-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_16px_30px_-20px_rgb(79_70_229/0.4)] active:scale-[0.99] dark:border-slate-800/90 dark:bg-slate-900/90 dark:hover:border-indigo-800 ${className}`}
      {...props}
    />
  );
}
