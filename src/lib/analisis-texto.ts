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
