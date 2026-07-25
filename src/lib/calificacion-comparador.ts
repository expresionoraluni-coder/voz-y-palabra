export type ContenidoComparador = {
  conceptos: string[];
  criterios: string[];
  banco_respuestas?: string[];
  celda_correcta?: string[][];
};

export type ContenidoComparadorPublico = {
  conceptos: string[];
  criterios: string[];
  banco_respuestas?: string[];
};

export function sanitizarContenidoComparador(contenido: ContenidoComparador): ContenidoComparadorPublico {
  return {
    conceptos: contenido.conceptos,
    criterios: contenido.criterios,
    banco_respuestas: contenido.banco_respuestas,
  };
}

// `banco_respuestas` no es secreto (se muestra siempre) y en el submodo
// "chips" siempre viene junto a `celda_correcta` completo (así lo exige el
// formulario de autoría) — es un discriminador seguro incluso después de
// quitar `celda_correcta` del contenido saneado.
export function esModoChips(contenido: { banco_respuestas?: string[] }): boolean {
  return !!contenido.banco_respuestas?.length;
}

export function calificarComparadorChips(contenido: ContenidoComparador, celdas: string[][]) {
  const celdaCorrecta = contenido.celda_correcta ?? [];
  const resultadoCeldas = celdaCorrecta.map((fila, i) => fila.map((correcta, j) => celdas[i]?.[j] === correcta));
  const total = resultadoCeldas.flat().length;
  const aciertos = resultadoCeldas.flat().filter(Boolean).length;
  const puntajeAuto = total === 0 ? 0 : Math.round((aciertos / total) * 100);
  return { puntajeAuto, resultadoCeldas };
}
