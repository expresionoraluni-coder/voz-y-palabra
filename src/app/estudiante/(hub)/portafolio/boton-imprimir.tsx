"use client";

import { Printer } from "lucide-react";
import Boton from "@/components/ui/button";

export default function BotonImprimir() {
  return (
    <Boton variant="secondary" size="sm" onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden="true" />
      Descargar / imprimir
    </Boton>
  );
}
