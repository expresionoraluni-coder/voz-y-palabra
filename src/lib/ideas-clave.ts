function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/** Ideas clave (definidas por la docente) que sí aparecen en el texto del estudiante. */
export function ideasClaveMencionadas(texto: string, ideasClave: string[]): string[] {
  const normalizado = normalizar(texto);
  return ideasClave.filter((idea) => normalizado.includes(normalizar(idea)));
}
