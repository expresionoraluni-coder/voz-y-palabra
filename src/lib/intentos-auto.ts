// La mayoría de las actividades conserva una sola entrega por estudiante. Las
// actividades que publican una segunda variante pueden llegar a dos; la base
// de datos vuelve a comprobar qué actividad tiene esa excepción.
export const MAX_INTENTOS_AUTO = 1;
export const MAX_INTENTOS_AUTO_PERMITIDOS = 2;
// A partir de 70% el resultado se considera suficiente para continuar sin
// obligar a repetir; por debajo de ese umbral, la variante alternativa es
// una oportunidad formativa necesaria antes de avanzar.
export const PUNTAJE_MINIMO_SIN_REINTENTO = 70;

export type MetaEntregaAuto = {
  intentos: number;
  mejorPuntaje: number;
  ejercicio?: 1 | 2;
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
  const ejercicio = respuesta._meta.ejercicio;
  if (
    typeof intentos !== "number" ||
    !Number.isInteger(intentos) ||
    intentos < 1 ||
    intentos > MAX_INTENTOS_AUTO_PERMITIDOS ||
    typeof mejorPuntaje !== "number" ||
    !Number.isInteger(mejorPuntaje) ||
    mejorPuntaje < 0 ||
    mejorPuntaje > 100 ||
    (ejercicio !== undefined && ejercicio !== 1 && ejercicio !== 2)
  ) {
    return null;
  }

  return {
    intentos,
    mejorPuntaje,
    ...(ejercicio === 1 || ejercicio === 2 ? { ejercicio } : {}),
  };
}

export function tieneReintentoAlternativo(contenido: unknown): boolean {
  return esRegistroPlano(contenido) && esRegistroPlano(contenido.reintento_alternativo);
}

export function intentosDeEntregaAuto(respuesta: unknown, tieneEntrega = false): number {
  return metaDeEntregaAuto(respuesta)?.intentos ?? (tieneEntrega ? 1 : 0);
}

export function requiereReintentoAlternativo(
  contenido: unknown,
  respuesta: unknown,
  puntajeAuto: number | null,
): boolean {
  return (
    tieneReintentoAlternativo(contenido) &&
    intentosDeEntregaAuto(respuesta, true) < MAX_INTENTOS_AUTO_PERMITIDOS &&
    puntajeAuto !== null &&
    puntajeAuto < PUNTAJE_MINIMO_SIN_REINTENTO
  );
}

export function mejorPuntajeDeEntregaAuto(respuesta: unknown, puntajeFallback: number | null): number | null {
  return metaDeEntregaAuto(respuesta)?.mejorPuntaje ?? puntajeFallback;
}

export function quitarMetaEntregaAuto(respuesta: Record<string, unknown>): Record<string, unknown> {
  const respuestaLimpia = { ...respuesta };
  delete respuestaLimpia._meta;
  return respuestaLimpia;
}

export function puedeAbrirDependiente(puntaje: number | null, respuesta: unknown): boolean {
  // El desbloqueo depende de que exista una entrega, no de que alcance un
  // umbral ni de que todavía queden intentos.
  return Boolean(respuesta) || puntaje !== null;
}
