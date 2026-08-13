import "server-only";

export const MAX_BYTES_RESPUESTA = 18_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function esUuid(valor: unknown): valor is string {
  return typeof valor === "string" && UUID_RE.test(valor);
}

export function esRegistroPlano(valor: unknown): valor is Record<string, unknown> {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) return false;
  const prototipo = Object.getPrototypeOf(valor);
  return prototipo === Object.prototype || prototipo === null;
}

export function validarTexto(
  valor: unknown,
  opciones: { nombre: string; maximo: number; obligatorio?: boolean },
): string | null {
  if (typeof valor !== "string") return `${opciones.nombre} no es válido.`;
  if (opciones.obligatorio && !valor.trim()) return `${opciones.nombre} no puede quedar vacío.`;
  if (valor.length > opciones.maximo) return `${opciones.nombre} es demasiado largo.`;
  return null;
}

export function validarLista<T>(
  valor: unknown,
  opciones: { nombre: string; maximo: number; validarElemento?: (elemento: unknown) => boolean },
): valor is T[] {
  if (!Array.isArray(valor) || valor.length > opciones.maximo) return false;
  return opciones.validarElemento ? valor.every(opciones.validarElemento) : true;
}

export function validarJsonDeEntrega(respuesta: unknown): string | null {
  if (!esRegistroPlano(respuesta)) return "La respuesta de la actividad no es válida.";

  try {
    const serializada = JSON.stringify(respuesta);
    if (serializada === undefined || new TextEncoder().encode(serializada).length > MAX_BYTES_RESPUESTA) {
      return "La respuesta es demasiado grande. Reduce el texto o los elementos e inténtalo de nuevo.";
    }
  } catch {
    return "La respuesta contiene datos que no se pueden guardar.";
  }

  return null;
}

export function validarPuntaje(puntaje: unknown): puntaje is number | null {
  return puntaje === null || (typeof puntaje === "number" && Number.isInteger(puntaje) && puntaje >= 0 && puntaje <= 100);
}

export function validarEstadoEntrega(estado: unknown): estado is "completada" | "pendiente_revision" {
  return estado === "completada" || estado === "pendiente_revision";
}
