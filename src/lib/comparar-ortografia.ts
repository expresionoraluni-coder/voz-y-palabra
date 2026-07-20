export type ComparacionPalabra = { correcta: string; escrita: string; correcto: boolean };

function tokenizar(texto: string): string[] {
  return texto.trim().split(/\s+/).filter(Boolean);
}

// La puntuación no es lo que se evalúa aquí (eso es "puntuación", no
// "ortografía") — se recorta al inicio/fin de cada palabra antes de
// comparar, para que una coma de más o un punto olvidado no cuenten como
// error. El interior de la palabra (donde viven tildes, mayúsculas y
// letras) nunca se toca.
function quitarPuntuacionBorde(palabra: string): string {
  return palabra
    .replace(/^[¿¡"'«»(){}[\]—–-]+/, "")
    .replace(/[.,;:!?"'«»)(){}\]["'—–-]+$/, "");
}

export function compararPalabras(textoCorrecto: string, textoReescrito: string): ComparacionPalabra[] {
  const correctas = tokenizar(textoCorrecto);
  const escritas = tokenizar(textoReescrito);
  const total = Math.max(correctas.length, escritas.length);
  const comparacion: ComparacionPalabra[] = [];
  for (let i = 0; i < total; i++) {
    const correcta = correctas[i] ?? "";
    const escrita = escritas[i] ?? "";
    const correcto =
      correcta !== "" && escrita !== "" && quitarPuntuacionBorde(correcta) === quitarPuntuacionBorde(escrita);
    comparacion.push({ correcta, escrita, correcto });
  }
  return comparacion;
}

export function calificarOrtografia(textoCorrecto: string, textoReescrito: string) {
  const comparacion = compararPalabras(textoCorrecto, textoReescrito);
  const totalPalabras = comparacion.length;
  const errores = comparacion.filter((c) => !c.correcto).length;
  const aprobado = errores <= 5;
  const puntajeAuto = totalPalabras === 0 ? 0 : Math.round(((totalPalabras - errores) / totalPalabras) * 100);
  return { comparacion, totalPalabras, errores, aprobado, puntajeAuto };
}
