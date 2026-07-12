const MULETILLAS = [
  "cosa",
  "cosas",
  "algo",
  "bueno",
  "este",
  "eh",
  "osea",
  "digamos",
  "tipo",
  "básicamente",
  "literal",
  "muy",
  "bastante",
];

const CONECTORES = [
  "sin embargo",
  "por lo tanto",
  "además",
  "en consecuencia",
  "por otro lado",
  "asimismo",
  "en cambio",
  "no obstante",
  "por ejemplo",
  "es decir",
  "en resumen",
  "finalmente",
  "en conclusión",
  "debido a",
  "ya que",
  "puesto que",
];

const PALABRAS_VACIAS = new Set([
  "para",
  "como",
  "pero",
  "esto",
  "esta",
  "estos",
  "estas",
  "ese",
  "esa",
  "esos",
  "esas",
  "cuando",
  "donde",
  "porque",
  "también",
  "entre",
  "sobre",
  "hasta",
  "desde",
  "todo",
  "toda",
  "todos",
  "todas",
  "otro",
  "otra",
  "otros",
  "otras",
  "mucho",
  "mucha",
  "muchos",
  "muchas",
  "poco",
  "poca",
  "tanto",
  "tanta",
  "cual",
  "cuales",
  "quien",
  "quienes",
  "según",
  "sino",
  "sido",
  "siendo",
  "están",
  "estar",
  "hacer",
  "hace",
  "hacen",
  "puede",
  "pueden",
  "debe",
  "deben",
  "solo",
  "sólo",
]);

/** Palabras de contenido más frecuentes de un texto (sin palabras vacías). */
function palabrasClave(texto: string, top = 6): string[] {
  const palabras = texto.toLowerCase().match(/[a-záéíóúñü]{4,}/g) ?? [];
  const conteo = new Map<string, number>();
  for (const p of palabras) {
    if (PALABRAS_VACIAS.has(p)) continue;
    conteo.set(p, (conteo.get(p) ?? 0) + 1);
  }
  return [...conteo.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([p]) => p);
}

export type OverlapFuente = { retomadas: string[]; total: number };

/** De las palabras más frecuentes del texto fuente, cuáles retoma el resumen del estudiante. */
export function overlapConFuente(textoFuente: string, textoEstudiante: string): OverlapFuente {
  const clave = palabrasClave(textoFuente);
  const normalizado = textoEstudiante.toLowerCase();
  return { retomadas: clave.filter((p) => normalizado.includes(p)), total: clave.length };
}

export type AnalisisTexto = {
  palabras: number;
  oraciones: number;
  promedioPalabrasPorOracion: number;
  variedadLexica: number;
  muletillasDetectadas: { palabra: string; veces: number }[];
  conectoresUsados: string[];
  oracionesLargas: number;
};

const VACIO: AnalisisTexto = {
  palabras: 0,
  oraciones: 0,
  promedioPalabrasPorOracion: 0,
  variedadLexica: 0,
  muletillasDetectadas: [],
  conectoresUsados: [],
  oracionesLargas: 0,
};

export function analizarTexto(texto: string): AnalisisTexto {
  const limpio = texto.trim();
  if (!limpio) return VACIO;

  const palabrasArr = limpio.toLowerCase().match(/[a-záéíóúñü]+/g) ?? [];
  const palabras = palabrasArr.length;
  if (palabras === 0) return VACIO;

  const oracionesArr = limpio
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const oraciones = oracionesArr.length || 1;
  const promedioPalabrasPorOracion = Math.round(palabras / oraciones);
  const oracionesLargas = oracionesArr.filter((o) => (o.match(/\s+/g)?.length ?? 0) + 1 > 30).length;

  const unicas = new Set(palabrasArr);
  const variedadLexica = Math.round((unicas.size / palabras) * 100);

  const muletillasDetectadas = MULETILLAS.map((m) => {
    const veces = (limpio.toLowerCase().match(new RegExp(`\\b${m}\\b`, "g")) ?? []).length;
    return { palabra: m, veces };
  }).filter((m) => m.veces >= 2);

  const conectoresUsados = CONECTORES.filter((c) => new RegExp(`\\b${c}\\b`, "i").test(limpio));

  return {
    palabras,
    oraciones,
    promedioPalabrasPorOracion,
    variedadLexica,
    muletillasDetectadas,
    conectoresUsados,
    oracionesLargas,
  };
}
