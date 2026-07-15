type ErrorConCodigo = { message: string; code?: string } | null | undefined;

const GENERICO = "No pudimos guardar tu cambio. Intenta de nuevo.";

/**
 * Convierte un error de una mutación directa a una tabla (insert/update/
 * upsert/delete) en un mensaje seguro para mostrar al usuario. Postgres y
 * PostgREST devuelven en `.message` el texto interno real (nombres de
 * tabla, constraint, política RLS) — nunca se debe mostrar tal cual. Los
 * errores de `.rpc()` no pasan por aquí: esos son texto en español escrito
 * a propósito por la función para mostrarse directo.
 */
export function mensajeError(error: ErrorConCodigo, mapa: Record<string, string> = {}): string {
  if (!error) return GENERICO;
  if (error.code && mapa[error.code]) return mapa[error.code];
  return GENERICO;
}
