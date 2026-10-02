export type CasoCalibracion =
  | "sin_puntaje"
  | "sobreconfianza"
  | "subconfianza"
  | "bien_calibrado_alto"
  | "bien_calibrado_bajo";

export const TOLERANCIA_CALIBRACION_PUNTOS = 25;
export const PUNTAJE_CALIBRACION_SOLIDA = 70;

function casoCalibracionPct(confianzaPct: number | null, puntajeAuto: number | null): CasoCalibracion {
  if (confianzaPct == null || puntajeAuto == null) return "sin_puntaje";
  const diferencia = confianzaPct - puntajeAuto;
  if (diferencia > TOLERANCIA_CALIBRACION_PUNTOS) return "sobreconfianza";
  if (diferencia < -TOLERANCIA_CALIBRACION_PUNTOS) return "subconfianza";
  return puntajeAuto >= PUNTAJE_CALIBRACION_SOLIDA ? "bien_calibrado_alto" : "bien_calibrado_bajo";
}

/** Una calibración sólida implica alineación y un resultado suficiente. */
export function calibracionEsSolida(caso: CasoCalibracion): boolean {
  return caso === "bien_calibrado_alto";
}

export function casoCalibracion(confianza: number | null, puntajeAuto: number | null): CasoCalibracion {
  if (confianza == null) return "sin_puntaje";
  return casoCalibracionPct((confianza - 1) * 25, puntajeAuto);
}

export function mensajeCalibracion(confianza: number, puntajeAuto: number): string | null {
  switch (casoCalibracion(confianza, puntajeAuto)) {
    case "sobreconfianza":
      return `Tu nivel de seguridad era alto (${confianza}/5), pero acertaste ${puntajeAuto}% (repasa este tema antes de seguir para no confiarte de más la próxima vez).`;
    case "subconfianza":
      return `Tu nivel de seguridad era bajo (${confianza}/5), pero acertaste ${puntajeAuto}% (sabes más de lo que crees; confía un poco más en tus capacidades).`;
    case "bien_calibrado_alto":
      return `Tu confianza (${confianza}/5) estuvo alineada y tu resultado fue sólido (${puntajeAuto}%).`;
    case "bien_calibrado_bajo":
      return `Tu expectativa estuvo cerca de tu resultado (${puntajeAuto}%), pero todavía hay contenidos que conviene repasar antes de avanzar.`;
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
export function mensajeCalibracionUnidad(confianza: number | null, promedioUnidad: number | null): string | null {
  switch (casoCalibracion(confianza, promedioUnidad)) {
    case "sobreconfianza":
      return `Al empezar registraste un nivel de seguridad de ${confianza}/5, pero tu resultado promedio en la unidad fue ${promedioUnidad}% (te confiaste de más).`;
    case "subconfianza":
      return `Al empezar registraste un nivel de seguridad de ${confianza}/5, pero tu resultado promedio fue ${promedioUnidad}% (sabes más de lo que creías).`;
    case "bien_calibrado_alto":
      return `Tu confianza inicial (${confianza}/5) estuvo alineada y tu resultado promedio fue sólido (${promedioUnidad}%).`;
    case "bien_calibrado_bajo":
      return `Tu expectativa estuvo cerca del resultado promedio (${promedioUnidad}%), pero la unidad todavía necesita repaso y práctica.`;
    default:
      return null;
  }
}

export function placeholderReflexionUnidad(confianza: number | null, promedioUnidad: number | null): string {
  switch (casoCalibracion(confianza, promedioUnidad)) {
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
