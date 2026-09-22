export function contarPalabrasJustificacion(texto: string): number {
  return palabrasDe(texto).length;
}

function palabrasDe(texto: string): string[] {
  return (
    texto
      .toLocaleLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .match(/[a-zñ0-9]+/g) ?? []
  );
}

/**
 * Comprueba que la explicación sea propia y tenga suficiente contenido para
 * representar una decisión, sin pedir palabras clave de la respuesta.
 */
export function validarJustificacion(texto: string, opcion: string): string | null {
  const palabras = palabrasDe(texto);
  const unicas = new Set(palabras);
  const palabrasOpcion = new Set(palabrasDe(opcion));
  const palabrasPropias = palabras.filter((palabra) => palabra.length >= 3 && !palabrasOpcion.has(palabra));

  if (palabras.length < 8) {
    return `Escribe al menos 8 palabras; ahora llevas ${palabras.length}.`;
  }

  if (unicas.size < 4 || palabrasPropias.length < 3) {
    return "Explica con al menos 3 palabras propias; no repitas solo la opción.";
  }

  return null;
}
