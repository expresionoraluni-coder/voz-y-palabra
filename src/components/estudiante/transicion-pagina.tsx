"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

/** Mantiene una transición breve entre pantallas sin bloquear la navegación. */
export default function TransicionPagina({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="animate-entrada-pagina">
      {children}
    </div>
  );
}
