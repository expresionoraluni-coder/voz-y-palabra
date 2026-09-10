type ErrorDeConsulta = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
} | null | undefined;

/**
 * Convierte un fallo de lectura de Supabase en un error seguro para el
 * boundary de la ruta. No muestra mensajes internos de Postgres ni nombres
 * de tablas al estudiante o a la docente.
 */
export function revisarErrorConsulta(error: ErrorDeConsulta, mensaje: string): void {
  if (!error) return;

  // El detalle técnico no debe viajar al navegador, pero sí conservarse en
  // los logs server-side para poder distinguir RLS, timeout y errores de
  // esquema sin exponerlo al usuario.
  console.error("[supabase.query]", {
    contexto: mensaje,
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  });
  throw new Error(mensaje);
}
