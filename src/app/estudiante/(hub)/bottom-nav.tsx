"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, CalendarDays, FolderHeart, Home, LineChart } from "lucide-react";

const ITEMS = [
  { href: "/estudiante/inicio", label: "Inicio", icon: Home },
  { href: "/estudiante/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/estudiante/progreso", label: "Progreso", icon: LineChart },
  { href: "/estudiante/portafolio", label: "Portafolio", icon: FolderHeart },
  { href: "/estudiante/insignias", label: "Insignias", icon: Award },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] print:hidden"
    >
      <div className="pointer-events-auto mx-auto flex max-w-xl items-stretch justify-around rounded-[1.5rem] border border-white/70 bg-white/85 p-1.5 shadow-[0_16px_40px_-18px_rgb(15_23_42/0.45)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/85">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const activo = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={activo ? "page" : undefined}
              className={`relative mx-0.5 flex min-h-12 min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-1 rounded-[1.1rem] whitespace-nowrap px-1 py-2 text-[11px] font-semibold transition-[color,background-color,transform,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 active:scale-95 ${
                activo
                  ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/25"
                  : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="size-5" aria-hidden="true" strokeWidth={activo ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
