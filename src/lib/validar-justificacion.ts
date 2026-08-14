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
    return "Explica con una oración completa qué te llevó a elegir esa opción.";
  }

  if (unicas.size < 4 || palabrasPropias.length < 3) {
    return "Escribe una explicación propia, no repitas solo la opción ni uses texto al azar.";
  }

  return null;
}
