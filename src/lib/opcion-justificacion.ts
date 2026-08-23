// opcion_justificacion puede tener varias "rondas" dentro de una actividad.
// Se conserva la lectura de la forma plana únicamente para no romper entregas
// históricas; el editor y las actividades vigentes guardan siempre rondas.

// Todo lo que NO es la clave de calificación — lo único que el cliente
// necesita para renderizar la pregunta antes de contestar. `RondaContenido`
// (con la clave) es server-only a partir de este cambio; el componente
// cliente solo recibe `RondaContenidoPublica`.
type RondaBase = {
  contexto?: string;
  pregunta: string;
  opciones: string[];
  mensajesVisibles?: number;
};

export type RondaContenido = RondaBase & { respuesta_correcta: string };
export type RondaContenidoPublica = RondaBase;

// Hilo de mensajes (ej. una conversación de WhatsApp) que enmarca las rondas
// de una actividad narrada. "nota" es un texto corto opcional que se muestra
// como divisor arriba de ese mensaje (ej. "3 horas después").
export type MensajeChat = { de: string; texto: string; nota?: string };

// Parametrizado por el tipo de ronda para poder reusar exactamente la misma
// lógica de forma-unión (plana vs. {rondas}) tanto con la clave (server)
// como sin ella (cliente) — ninguno de estos helpers toca `respuesta_correcta`.
type ContenidoConRondas<R extends RondaBase> =
  | R
  | {
      intro?: string;
      rondas: R[];
      presentacion?: "asistente" | "todas_juntas";
      mensajes?: MensajeChat[];
    };

export type ContenidoOpcionJustificacion = ContenidoConRondas<RondaContenido>;
export type ContenidoOpcionJustificacionPublico = ContenidoConRondas<RondaContenidoPublica>;

export type RondaRespuesta = { opcion: string; justificacion: string };

export type RespuestaOpcionJustificacion = RondaRespuesta | { rondas: RondaRespuesta[] };

export function rondasDeContenido<R extends RondaBase>(c: ContenidoConRondas<R>): R[] {
  return "rondas" in c && Array.isArray(c.rondas) ? c.rondas : [c as R];
}

export function introDeContenido<R extends RondaBase>(c: ContenidoConRondas<R>): string | undefined {
  return "rondas" in c ? c.intro : undefined;
}

export function presentacionDeContenido<R extends RondaBase>(
  c: ContenidoConRondas<R>,
): "asistente" | "todas_juntas" {
  return "rondas" in c && c.presentacion === "todas_juntas" ? "todas_juntas" : "asistente";
}

export function mensajesDeContenido<R extends RondaBase>(c: ContenidoConRondas<R>): MensajeChat[] {
  return "rondas" in c && Array.isArray(c.mensajes) ? c.mensajes : [];
}

export function rondasDeRespuesta(r?: Record<string, unknown> | null): RondaRespuesta[] {
  if (!r) return [];
  if (Array.isArray((r as { rondas?: unknown }).rondas)) {
    return (r as { rondas: RondaRespuesta[] }).rondas;
  }
  if (typeof (r as { opcion?: unknown }).opcion === "string") {
    const flat = r as { opcion: string; justificacion?: string };
    return [{ opcion: flat.opcion, justificacion: flat.justificacion ?? "" }];
  }
  return [];
}

function quitarClave(r: RondaContenido): RondaContenidoPublica {
  const resto = { ...r } as RondaContenidoPublica & { respuesta_correcta?: string };
  delete resto.respuesta_correcta;
  return resto;
}

export function sanitizarContenido(c: ContenidoOpcionJustificacion): ContenidoOpcionJustificacionPublico {
  if ("rondas" in c) {
    return { intro: c.intro, rondas: c.rondas.map(quitarClave), presentacion: c.presentacion, mensajes: c.mensajes };
  }
  return quitarClave(c);
}

export function calificarRondas(rondas: RondaContenido[], respuestas: RondaRespuesta[]) {
  return rondas.map((r, i) => ({
    correcta: respuestas[i]?.opcion === r.respuesta_correcta,
  }));
}
