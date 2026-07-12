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
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-950/95"
    >
      <div className="mx-auto flex max-w-2xl items-stretch justify-around">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const activo = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={activo ? "page" : undefined}
              className={`flex min-w-[64px] flex-1 flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${
                activo
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
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
