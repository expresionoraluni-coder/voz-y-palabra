export type CasoCalibracion =
  | "sin_puntaje"
  | "sobreconfianza"
  | "subconfianza"
  | "bien_calibrado_alto"
  | "bien_calibrado_bajo";

function casoCalibracionPct(confianzaPct: number | null, puntajeAuto: number | null): CasoCalibracion {
  if (confianzaPct == null || puntajeAuto == null) return "sin_puntaje";
  const diferencia = confianzaPct - puntajeAuto;
  if (diferencia > 25) return "sobreconfianza";
  if (diferencia < -25) return "subconfianza";
  return puntajeAuto >= 70 ? "bien_calibrado_alto" : "bien_calibrado_bajo";
}

export function casoCalibracion(confianza: number | null, puntajeAuto: number | null): CasoCalibracion {
  if (confianza == null) return "sin_puntaje";
  return casoCalibracionPct((confianza - 1) * 25, puntajeAuto);
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

// Versión a nivel unidad: misma lógica de calibración, pero la reflexión
// pregunta por estrategia de estudio (qué harás distinto la próxima unidad),
// no por dificultad puntual de una actividad — son preguntas de naturaleza
// distinta a propósito, para no repetir la pregunta de seguridad del inicio.
export function mensajeCalibracionUnidad(confianzaPct: number | null, promedioUnidad: number | null): string | null {
  switch (casoCalibracionPct(confianzaPct, promedioUnidad)) {
    case "sobreconfianza":
      return `Al empezar dijiste sentirte ${confianzaPct}% seguro, pero tu resultado promedio en la unidad fue ${promedioUnidad}% (te confiaste de más).`;
    case "subconfianza":
      return `Al empezar dijiste sentirte solo ${confianzaPct}% seguro, pero tu resultado promedio fue ${promedioUnidad}% (sabes más de lo que creías).`;
    case "bien_calibrado_alto":
    case "bien_calibrado_bajo":
      return `Tu confianza inicial (${confianzaPct}%) estuvo bien calibrada con tu resultado promedio en la unidad (${promedioUnidad}%).`;
    default:
      return null;
  }
}

export function placeholderReflexionUnidad(confianzaPct: number | null, promedioUnidad: number | null): string {
  switch (casoCalibracionPct(confianzaPct, promedioUnidad)) {
    case "sobreconfianza":
      return "¿Qué creías dominar al empezar la unidad y no era así? ¿Qué estrategia usarás la próxima vez para no confiarte de más?";
    case "subconfianza":
      return "¿Qué te hizo dudar de ti, si al final tu resultado fue mejor de lo que esperabas?";
    case "bien_calibrado_alto":
      return "¿Qué estrategias de estudio te funcionaron en esta unidad? ¿Las repetirás en la siguiente?";
    case "bien_calibrado_bajo":
      return "¿Qué necesitas cambiar en tu forma de estudiar antes de la siguiente unidad?";
    default:
      return "¿Lograste lo que te propusiste? ¿Qué fue lo más difícil de esta unidad?";
  }
}
