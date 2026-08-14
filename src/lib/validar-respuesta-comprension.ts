function palabrasDe(texto: string): string[] {
  return texto.trim().split(/\s+/).filter(Boolean);
}

export function validarRespuestaComprension(texto: string): string | null {
  const palabras = palabrasDe(texto);
  if (palabras.length < 8) {
    return "Escribe una respuesta completa antes de marcar la lectura como terminada.";
  }

  if (new Set(palabras.map((palabra) => palabra.toLocaleLowerCase())).size < 5) {
    return "Explica la diferencia con tus propias palabras, no repitas una misma frase.";
  }

  return null;
}
