/**
 * El catálogo conserva algunas dependencias históricas para imponer orden
 * entre actividades comunes. Solo las parejas de clasificación (nivel 1 / 2)
 * deben bloquear la entrada a la segunda actividad.
 */
export function esDependenciaDosNiveles(
  tipoActividad: string | null | undefined,
  tipoRequisito: string | null | undefined,
): boolean {
  return tipoActividad === "clasificacion" && tipoRequisito === "clasificacion";
}
