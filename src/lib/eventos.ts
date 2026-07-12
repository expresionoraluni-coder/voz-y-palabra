export type TipoEvento = "examen" | "proyecto" | "entrega" | "otro";

export const TIPOS_EVENTO: Record<TipoEvento, { etiqueta: string; conector: string }> = {
  examen: { etiqueta: "Examen", conector: "Repasa antes de tu examen" },
  proyecto: { etiqueta: "Proyecto", conector: "Antes de tu proyecto, revisa" },
  entrega: { etiqueta: "Entrega", conector: "Antes de esta entrega, repasa" },
  otro: { etiqueta: "Otro", conector: "Antes de este evento, repasa" },
};

export function diasFaltantes(fecha: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const objetivo = new Date(fecha + "T00:00:00");
  return Math.round((objetivo.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

export function textoFaltan(dias: number): string {
  if (dias < 0) return `hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "día" : "días"}`;
  if (dias === 0) return "hoy";
  if (dias === 1) return "mañana";
  return `en ${dias} días`;
}
