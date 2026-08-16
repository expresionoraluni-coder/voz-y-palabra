type ErrorConCodigo = { message: string; code?: string } | null | undefined;
type ErrorAuth = { message?: string; code?: string } | null | undefined;

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

/**
 * Supabase Auth devuelve mensajes pensados para desarrolladores y puede
 * devolverlos en inglés. La interfaz docente solo debe mostrar mensajes
 * claros en español, sin filtrar detalles internos del proveedor.
 */
export function mensajeErrorAuth(error: ErrorAuth, contexto: "entrar" | "crear"): string {
  const texto = error?.message?.toLowerCase() ?? "";

  if (texto.includes("invalid login credentials") || texto.includes("invalid credentials")) {
    return "El correo o la contraseña no son correctos.";
  }
  if (texto.includes("email not confirmed") || texto.includes("email_not_confirmed")) {
    return "Primero confirma tu correo desde el mensaje que te enviamos.";
  }
  if (texto.includes("user already registered") || texto.includes("already been registered")) {
    return "Este correo ya tiene una cuenta. Regresa a «Iniciar sesión» para entrar.";
  }
  if (texto.includes("password should be at least") || texto.includes("password must be at least")) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  if (texto.includes("password") && (texto.includes("breached") || texto.includes("leaked") || texto.includes("pwned"))) {
    return "Elige otra contraseña: la actual aparece en una lista pública de contraseñas comprometidas.";
  }
  if (texto.includes("rate limit") || texto.includes("too many requests") || error?.code === "429") {
    return "Se intentó demasiadas veces. Espera un momento y vuelve a intentarlo.";
  }
  if (texto.includes("network") || texto.includes("fetch") || texto.includes("timeout")) {
    return "No pudimos conectar con la plataforma. Revisa tu conexión e inténtalo de nuevo.";
  }

  return contexto === "entrar"
    ? "No pudimos iniciar sesión. Revisa tus datos e inténtalo de nuevo."
    : "No pudimos crear la cuenta. Revisa tus datos e inténtalo de nuevo.";
}

/**
 * Conserva algunos mensajes de negocio que una función RPC declara de forma
 * explícita, pero oculta nombres de tablas, constraints y demás detalles de
 * Postgres cuando el proveedor devuelve un error inesperado.
 */
export function mensajeErrorRpc(
  error: ErrorAuth,
  permitidos: Array<{ contiene: string; mensaje: string }>,
  generico = "No pudimos completar la acción. Intenta de nuevo.",
): string {
  const texto = error?.message ?? "";
  const permitido = permitidos.find((item) => texto.includes(item.contiene));
  return permitido?.mensaje ?? generico;
}
