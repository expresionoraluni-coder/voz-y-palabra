function palabrasSignificativas(texto: string): Set<string> {
  return new Set((texto.toLowerCase().match(/[a-záéíóúñü]{3,}/g) ?? []));
}

/** Similitud de Jaccard entre dos textos: 0 = nada en común, 1 = mismas palabras. */
export function similitudTexto(a: string, b: string): number {
  const palabrasA = palabrasSignificativas(a);
  const palabrasB = palabrasSignificativas(b);
  if (palabrasA.size === 0 || palabrasB.size === 0) return 0;

  let interseccion = 0;
  for (const p of palabrasA) if (palabrasB.has(p)) interseccion++;
  const union = palabrasA.size + palabrasB.size - interseccion;

  return union === 0 ? 0 : interseccion / union;
}
