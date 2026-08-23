export type ComparacionPalabra = { correcta: string; escrita: string; correcto: boolean };
export type ComparacionPalabraPublica = { escrita: string; correcto: boolean };

export type ContenidoOrtografia = {
  contexto?: string | null;
  texto_incorrecto: string;
  texto_correcto: string;
  temas?: string[];
};

export type ContenidoOrtografiaPublico = {
  contexto?: string | null;
  texto_incorrecto: string;
  temas?: string[];
};

export function sanitizarContenidoOrtografia(contenido: ContenidoOrtografia): ContenidoOrtografiaPublico {
  return { contexto: contenido.contexto, texto_incorrecto: contenido.texto_incorrecto, temas: contenido.temas };
}

export function tokenizar(texto: string): string[] {
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

function normalizarPalabra(palabra: string): string {
  return quitarPuntuacionBorde(palabra).normalize("NFC").toLocaleLowerCase("es-MX");
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
      correcta !== "" && escrita !== "" && normalizarPalabra(correcta) === normalizarPalabra(escrita);
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
