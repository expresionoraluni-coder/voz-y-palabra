/** Días consecutivos con al menos una entrega, con un día de gracia (si hoy
 * todavía no hace nada pero ayer sí, la racha sigue viva hasta medianoche). */
export function calcularRacha(fechasISO: string[]): number {
  const dias = new Set(fechasISO.map((f) => f.slice(0, 10)));
  const clave = (d: Date) => d.toISOString().slice(0, 10);

  const cursor = new Date();
  if (!dias.has(clave(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!dias.has(clave(cursor))) return 0;
  }

  let racha = 0;
  while (dias.has(clave(cursor))) {
    racha++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return racha;
}
