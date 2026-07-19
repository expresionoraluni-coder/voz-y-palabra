export type CasoCalibracion =
  | "sin_puntaje"
  | "sobreconfianza"
  | "subconfianza"
  | "bien_calibrado_alto"
  | "bien_calibrado_bajo";

export function casoCalibracion(confianza: number | null, puntajeAuto: number | null): CasoCalibracion {
  if (confianza == null || puntajeAuto == null) return "sin_puntaje";
  const confianzaPct = (confianza - 1) * 25;
  const diferencia = confianzaPct - puntajeAuto;
  if (diferencia > 25) return "sobreconfianza";
  if (diferencia < -25) return "subconfianza";
  return puntajeAuto >= 70 ? "bien_calibrado_alto" : "bien_calibrado_bajo";
}

export function mensajeCalibracion(confianza: number, puntajeAuto: number): string | null {
  switch (casoCalibracion(confianza, puntajeAuto)) {
    case "sobreconfianza":
      return `Te sentías muy seguro (${confianza}/5) pero acertaste ${puntajeAuto}% (repasa este tema antes de seguir, para no confiar de más la próxima vez).`;
    case "subconfianza":
      return `Te sentías poco seguro (${confianza}/5) y acertaste ${puntajeAuto}% (sabes más de lo que crees, confía un poco más en ti).`;
    case "bien_calibrado_alto":
    case "bien_calibrado_bajo":
      return `Tu confianza (${confianza}/5) estuvo bien calibrada con tu resultado (${puntajeAuto}%).`;
    default:
      return null;
  }
}

export function placeholderReflexion(confianza: number | null, puntajeAuto: number | null): string {
  switch (casoCalibracion(confianza, puntajeAuto)) {
    case "sobreconfianza":
      return "¿Qué creías dominar y no era así?";
    case "subconfianza":
      return "¿Qué te hizo dudar de ti, si al final sabías más de lo que pensabas?";
    case "bien_calibrado_alto":
      return "¿Qué hiciste para prepararte tan bien?";
    case "bien_calibrado_bajo":
      return "¿Qué necesitas repasar antes de la próxima actividad parecida?";
    default:
      return "¿Qué fue lo más difícil de esta actividad? ¿Qué harías diferente?";
  }
}
