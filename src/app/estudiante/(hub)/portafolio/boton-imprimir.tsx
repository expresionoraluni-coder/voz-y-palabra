"use client";

import { Printer } from "lucide-react";
import Boton from "@/components/ui/button";

export default function BotonImprimir() {
  return (
    <Boton variant="secondary" size="sm" aria-label="Imprimir o guardar el portafolio como PDF" onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden="true" />
      Imprimir / guardar PDF
    </Boton>
  );
}
