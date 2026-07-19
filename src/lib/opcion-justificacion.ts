// opcion_justificacion pasó de una sola pregunta a poder tener varias
// "rondas" dentro de una misma actividad (ej. un simulador narrado paso a
// paso). Las ~4-5 actividades ya existentes en producción guardan la forma
// plana de antes ({pregunta, opciones, ideas_clave}); todo lo nuevo se
// guarda siempre como {rondas: [...]}, incluso con una sola pregunta. Estos
// helpers son el único lugar que necesita saber que ambas formas existen —
// el resto del código solo llama rondasDeContenido()/rondasDeRespuesta() y
// nunca vuelve a chequear la forma.

export type RondaContenido = {
  contexto?: string;
  pregunta: string;
  opciones: string[];
  respuesta_correcta: string;
  ideas_clave?: string[];
  mensajesVisibles?: number;
};

// Hilo de mensajes (ej. una conversación de WhatsApp) que enmarca las rondas
// de una actividad narrada. "nota" es un texto corto opcional que se muestra
// como divisor arriba de ese mensaje (ej. "3 horas después").
export type MensajeChat = { de: string; texto: string; nota?: string };

export type ContenidoOpcionJustificacion =
  | RondaContenido
  | {
      intro?: string;
      rondas: RondaContenido[];
      presentacion?: "asistente" | "todas_juntas";
      mensajes?: MensajeChat[];
    };

export type RondaRespuesta = { opcion: string; justificacion: string };

export type RespuestaOpcionJustificacion = RondaRespuesta | { rondas: RondaRespuesta[] };

export function rondasDeContenido(c: ContenidoOpcionJustificacion): RondaContenido[] {
  return "rondas" in c && Array.isArray(c.rondas) ? c.rondas : [c as RondaContenido];
}

export function introDeContenido(c: ContenidoOpcionJustificacion): string | undefined {
  return "rondas" in c ? c.intro : undefined;
}

export function presentacionDeContenido(c: ContenidoOpcionJustificacion): "asistente" | "todas_juntas" {
  return "rondas" in c && c.presentacion === "todas_juntas" ? "todas_juntas" : "asistente";
}

export function mensajesDeContenido(c: ContenidoOpcionJustificacion): MensajeChat[] {
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
