export const UUID_FRAGMENT = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const UUID_RE = new RegExp(`^${UUID_FRAGMENT}$`, "i");

/** Valida UUID v1–v5 en código de servidor y de cliente. */
export function esUuid(valor: unknown): valor is string {
  return typeof valor === "string" && UUID_RE.test(valor);
}
