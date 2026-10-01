type ErrorConCodigo = { message: string; code?: string } | null | undefined;
type ErrorAuth = { message?: string; code?: string } | null | undefined;

const GENERICO = "No pudimos completar el cambio. Intenta de nuevo.";

const MENSAJES_POR_CODIGO: Record<string, string> = {
  // La función de mantenimiento se habilita con una migración independiente.
  // Este mensaje evita reintentos confusos y deja claro que no se borró nada.
  PGRST202: "Esta función todavía no está habilitada en la base de datos. No se modificó ningún dato; avisa a administración para activar la actualización.",
  23505: "Ese registro ya existe. Revisa los datos e inténtalo de nuevo.",
  23503: "No se puede completar porque la información está relacionada con otro registro.",
  23514: "Alguno de los datos ya no es válido. Revísalo e inténtalo de nuevo.",
  "22P02": "Uno de los datos no tiene un formato válido. Revísalo e inténtalo de nuevo.",
  40001: "La información cambió mientras confirmabas. Actualiza la vista e inténtalo de nuevo.",
  "401": "Tu sesión ya no es válida. Entra de nuevo para continuar.",
  "403": "Tu sesión no tiene permiso para realizar este cambio.",
  "409": "La información cambió o ese registro ya existe. Actualiza la vista e inténtalo de nuevo.",
  "429": "Se intentó demasiadas veces. Espera un momento y vuelve a intentarlo.",
  "500": "El servicio tuvo un problema temporal. Intenta de nuevo en unos momentos.",
  42501: "Tu sesión no tiene permiso para realizar este cambio.",
  PGRST116: "No encontramos la información que intentabas actualizar. Actualiza la vista e inténtalo de nuevo.",
  PGRST301: "Tu sesión ya no es válida. Entra de nuevo para continuar.",
};

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
  if (typeof window === "undefined") {
    console.error("[supabase.mutation]", {
      code: error.code ?? null,
      message: error.message,
    });
  }
  if (error.code && mapa[error.code]) return mapa[error.code];
  if (error.code && MENSAJES_POR_CODIGO[error.code]) return MENSAJES_POR_CODIGO[error.code];

  const texto = error.message.toLowerCase();
  if (texto.includes("network") || texto.includes("fetch") || texto.includes("timeout") || texto.includes("failed to fetch")) {
    return "No pudimos conectar con la plataforma. Revisa tu conexión e inténtalo de nuevo.";
  }
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
  if (texto.includes("código de invitación") || texto.includes("codigo de invitacion")) {
    return "El código de invitación no es correcto.";
  }
  if (texto.includes("user already registered") || texto.includes("already been registered")) {
    return contexto === "crear"
      ? "No pudimos crear la cuenta con esos datos. Si el correo puede registrarse, recibirás instrucciones para confirmar tu cuenta."
      : "El correo o la contraseña no son correctos.";
  }
  if (
    texto.includes("password should be at least") ||
    texto.includes("password must be at least") ||
    texto.includes("weak password") ||
    texto.includes("password does not meet")
  ) {
    return "La contraseña debe tener al menos 12 caracteres, con mayúsculas, minúsculas, números y símbolos.";
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
  if (!error) return generico;
  if (error.code && MENSAJES_POR_CODIGO[error.code]) return MENSAJES_POR_CODIGO[error.code];
  const texto = error.message ?? "";
  const textoNormalizado = texto.toLowerCase();
  const permitido = permitidos.find((item) => textoNormalizado.includes(item.contiene.toLowerCase()));
  if (textoNormalizado.includes("network") || textoNormalizado.includes("fetch") || textoNormalizado.includes("timeout")) {
    return "No pudimos conectar con la plataforma. Revisa tu conexión e inténtalo de nuevo.";
  }
  return permitido?.mensaje ?? generico;
}
