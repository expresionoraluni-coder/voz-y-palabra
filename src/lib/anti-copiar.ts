import type { ClipboardEvent } from "react";

// Freno, no barrera real: nada del lado del cliente detiene devtools ni una
// captura de pantalla. Solo hace más lento copiar o pegar sin leer el material.
export function bloquearPegado(e: ClipboardEvent) {
  e.preventDefault();
}

export function bloquearCopiar(e: ClipboardEvent) {
  e.preventDefault();
}
