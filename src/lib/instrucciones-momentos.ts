export type InstruccionesMomentos = {
  presentacion: string;
  video: string;
  actividad: string;
};

export const INSTRUCCION_PRESENTACION_POR_DEFECTO =
  "Lee el propósito de la actividad y piensa qué esperas comprender o lograr antes de continuar.";

export const INSTRUCCION_VIDEO_POR_DEFECTO =
  "Observa el video con atención. Identifica una idea, ejemplo o estrategia que te ayude a resolver la actividad.";

type ContenidoConMomentos = {
  instrucciones_momentos?: Partial<InstruccionesMomentos> | null;
};

export function instruccionesMomentosDeContenido(
  contenido: unknown,
  instruccionActividad: string,
): InstruccionesMomentos {
  const datos = contenido && typeof contenido === "object" && !Array.isArray(contenido)
    ? contenido as ContenidoConMomentos
    : {};
  const momentos = datos.instrucciones_momentos ?? {};

  return {
    presentacion:
      typeof momentos.presentacion === "string" && momentos.presentacion.trim()
        ? momentos.presentacion.trim()
        : INSTRUCCION_PRESENTACION_POR_DEFECTO,
    video:
      typeof momentos.video === "string" && momentos.video.trim()
        ? momentos.video.trim()
        : INSTRUCCION_VIDEO_POR_DEFECTO,
    actividad:
      typeof momentos.actividad === "string" && momentos.actividad.trim()
        ? momentos.actividad.trim()
        : instruccionActividad.trim(),
  };
}

