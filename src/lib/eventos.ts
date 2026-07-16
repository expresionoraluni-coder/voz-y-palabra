export type TipoEvento = "examen" | "proyecto" | "entrega" | "otro";

export const TIPOS_EVENTO: Record<TipoEvento, { etiqueta: string; conector: string }> = {
  examen: { etiqueta: "Examen", conector: "Repasa antes de tu examen" },
  proyecto: { etiqueta: "Proyecto", conector: "Antes de tu proyecto, revisa" },
  entrega: { etiqueta: "Entrega", conector: "Antes de esta entrega, repasa" },
  otro: { etiqueta: "Otro", conector: "Antes de este evento, repasa" },
};

import { hoyMexico } from "./fecha-mexico";

const UN_DIA_MS = 1000 * 60 * 60 * 24;

export function diasFaltantes(fecha: string): number {
  // Ambas fechas se anclan a medianoche UTC de su propio día calendario, no
  // a la hora local del servidor — así la resta da una diferencia de días
  // calendario limpia, sin que la zona horaria del servidor la corra.
  const hoy = new Date(hoyMexico() + "T00:00:00Z");
  const objetivo = new Date(fecha + "T00:00:00Z");
  return Math.round((objetivo.getTime() - hoy.getTime()) / UN_DIA_MS);
}

export function textoFaltan(dias: number): string {
  if (dias < 0) return `hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "día" : "días"}`;
  if (dias === 0) return "hoy";
  if (dias === 1) return "mañana";
  return `en ${dias} días`;
}
