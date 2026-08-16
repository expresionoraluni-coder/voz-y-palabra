type ErrorDeConsulta = { message?: string; code?: string } | null | undefined;

/**
 * Convierte un fallo de lectura de Supabase en un error seguro para el
 * boundary de la ruta. No muestra mensajes internos de Postgres ni nombres
 * de tablas al estudiante o a la docente.
 */
export function revisarErrorConsulta(error: ErrorDeConsulta, mensaje: string): void {
  if (error) throw new Error(mensaje);
}
