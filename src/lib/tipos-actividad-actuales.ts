/**
 * Tipos que forman parte del catálogo vigente de Voz y Palabra.
 *
 * Los tipos históricos pueden seguir existiendo en datos antiguos, pero no
 * deben aparecer en el editor ni abrirse como una actividad nueva.
 */
export const TIPOS_ACTIVIDAD_ACTUALES = [
  "opcion_justificacion",
  "clasificacion",
  "comparador",
  "redaccion_checklist",
  "etiquetado_texto",
  "ordenar_fragmentos",
  "evaluar_videos",
  "corregir_ortografia",
] as const;

export type TipoActividadActual = (typeof TIPOS_ACTIVIDAD_ACTUALES)[number];

export function esTipoActividadActual(nombre: string | null | undefined): nombre is TipoActividadActual {
  return Boolean(nombre && TIPOS_ACTIVIDAD_ACTUALES.includes(nombre as TipoActividadActual));
}
