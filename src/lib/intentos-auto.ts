export const MAX_INTENTOS_AUTO = 3;
export const PUNTAJE_DESBLOQUEO = 70;

export type MetaEntregaAuto = {
  intentos: number;
  mejorPuntaje: number;
};

function esRegistroPlano(valor: unknown): valor is Record<string, unknown> {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) return false;
  const prototipo = Object.getPrototypeOf(valor);
  return prototipo === Object.prototype || prototipo === null;
}

export function metaDeEntregaAuto(respuesta: unknown): MetaEntregaAuto | null {
  if (!esRegistroPlano(respuesta) || !esRegistroPlano(respuesta._meta)) return null;

  const intentos = respuesta._meta.intentos;
  const mejorPuntaje = respuesta._meta.mejorPuntaje;
  if (
    typeof intentos !== "number" ||
    !Number.isInteger(intentos) ||
    intentos < 1 ||
    intentos > MAX_INTENTOS_AUTO ||
    typeof mejorPuntaje !== "number" ||
    !Number.isInteger(mejorPuntaje) ||
    mejorPuntaje < 0 ||
    mejorPuntaje > 100
  ) {
    return null;
  }

  return { intentos, mejorPuntaje };
}

export function intentosDeEntregaAuto(respuesta: unknown, tieneEntrega = false): number {
  return metaDeEntregaAuto(respuesta)?.intentos ?? (tieneEntrega ? 1 : 0);
}

export function mejorPuntajeDeEntregaAuto(respuesta: unknown, puntajeFallback: number | null): number | null {
  return metaDeEntregaAuto(respuesta)?.mejorPuntaje ?? puntajeFallback;
}

export function quitarMetaEntregaAuto(respuesta: Record<string, unknown>): Record<string, unknown> {
  const respuestaLimpia = { ...respuesta };
  delete respuestaLimpia._meta;
  return respuestaLimpia;
}

export function agregarMetaEntregaAuto(
  respuesta: Record<string, unknown>,
  meta: MetaEntregaAuto,
): Record<string, unknown> {
  return { ...quitarMetaEntregaAuto(respuesta), _meta: meta };
}

export function puedeAbrirDependiente(puntaje: number | null, respuesta: unknown): boolean {
  return (puntaje ?? 0) >= PUNTAJE_DESBLOQUEO || intentosDeEntregaAuto(respuesta) >= MAX_INTENTOS_AUTO;
}
