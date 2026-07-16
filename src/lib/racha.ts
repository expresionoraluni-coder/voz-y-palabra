import { aFechaMexico } from "./fecha-mexico";

const UN_DIA_MS = 24 * 60 * 60 * 1000;

/** Días consecutivos con al menos una entrega, con un día de gracia (si hoy
 * todavía no hace nada pero ayer sí, la racha sigue viva hasta medianoche).
 * Los días se cuentan en la zona horaria de México, no en UTC del servidor. */
export function calcularRacha(fechasISO: string[]): number {
  const dias = new Set(fechasISO.map((f) => aFechaMexico(f)));

  let cursorMs = Date.now();
  if (!dias.has(aFechaMexico(new Date(cursorMs)))) {
    cursorMs -= UN_DIA_MS;
    if (!dias.has(aFechaMexico(new Date(cursorMs)))) return 0;
  }

  let racha = 0;
  while (dias.has(aFechaMexico(new Date(cursorMs)))) {
    racha++;
    cursorMs -= UN_DIA_MS;
  }
  return racha;
}
