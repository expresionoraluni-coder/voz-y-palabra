import type { ClipboardEvent } from "react";

// Freno, no barrera real: nada del lado del cliente detiene devtools ni una
// captura de pantalla. Solo hace más lento pegar una respuesta copiada de
// otro sitio o de un chatbot en las actividades de respuesta abierta.
export function bloquearPegado(e: ClipboardEvent) {
  e.preventDefault();
}

export function bloquearCopiar(e: ClipboardEvent) {
  e.preventDefault();
}
