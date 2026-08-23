import type { CategoriaReporte } from "./reportes-constantes";

export type FaqOpcion = {
  id: string;
  etiqueta: string;
};

export type FaqPregunta = {
  id: string;
  pregunta: string;
  opciones: FaqOpcion[];
};

export type FaqArticulo = {
  id: string | null;
  audiencia: "estudiante" | "docente" | "ambos";
  categoria: string;
  slug: string;
  titulo: string;
  resumen: string;
  pasos: string[];
  preguntas: FaqPregunta[];
};

type FaqArticuloCrudo = {
  id?: unknown;
  audiencia?: unknown;
  categoria?: unknown;
  slug?: unknown;
  titulo?: unknown;
  resumen?: unknown;
  pasos?: unknown;
  preguntas?: unknown;
};

const PREGUNTAS_ESTUDIANTE: Partial<Record<CategoriaReporte, FaqPregunta[]>> = {
  estudiante_acceso: [{ id: "causa", pregunta: "¿Qué sucede al intentar entrar?", opciones: [{ id: "grupo", etiqueta: "No encuentro mi grupo" }, { id: "nip", etiqueta: "Mi NIP no funciona" }, { id: "nombre", etiqueta: "Mi nombre no coincide" }] }],
  estudiante_actividad: [{ id: "causa", pregunta: "¿Qué impide continuar?", opciones: [{ id: "bloqueo", etiqueta: "La actividad está bloqueada" }, { id: "error", etiqueta: "Aparece un error" }, { id: "intento", etiqueta: "Ya no puedo volver a intentarlo" }] }],
  estudiante_video: [{ id: "resultado", pregunta: "¿Qué ocurre con el video?", opciones: [{ id: "no_abre", etiqueta: "No abre" }, { id: "lento", etiqueta: "Carga muy lento" }, { id: "incorrecto", etiqueta: "Es otro video" }] }],
};

const PREGUNTAS_DOCENTE: Partial<Record<CategoriaReporte, FaqPregunta[]>> = {
  docente_estudiantes: [{ id: "causa", pregunta: "¿Qué necesitas resolver?", opciones: [{ id: "carga", etiqueta: "No aparecen tras cargar el archivo" }, { id: "duplicado", etiqueta: "Hay estudiantes duplicados" }, { id: "nip", etiqueta: "Necesito reiniciar un NIP" }] }],
  docente_actividad: [{ id: "causa", pregunta: "¿Qué parte presenta el problema?", opciones: [{ id: "guardar", etiqueta: "No puedo guardar" }, { id: "contenido", etiqueta: "No sé cómo configurar el contenido" }, { id: "bloqueo", etiqueta: "No puedo editarla" }] }],
};

const PASOS_FALLBACK: Partial<Record<CategoriaReporte, string[]>> = {
  estudiante_acceso: ["Usa el código exacto de tu grupo.", "Escribe tu nombre como aparece en la lista.", "Si olvidaste el NIP, pide a tu docente que lo reinicie."],
  estudiante_actividad: ["Guarda tu respuesta antes de salir.", "Completa la actividad anterior y su reflexión si está pendiente.", "Cada actividad tiene un solo intento; revisa antes de guardar."],
  estudiante_video: ["Comprueba tu conexión.", "Actualiza una sola vez.", "Prueba otra red o dispositivo."],
  estudiante_avance: ["Confirma que la actividad anterior esté guardada.", "Revisa si falta una reflexión o el cierre de la unidad.", "Actualiza una sola vez después de guardar."],
  docente_estudiantes: ["Confirma nombre y boleta.", "Corrige filas incompletas o duplicadas.", "Reinicia el NIP desde la ficha del estudiante."],
  docente_actividad: ["Completa título, instrucciones, tipo y orden.", "Revisa la vista previa.", "Espera la confirmación antes de guardar otra vez."],
  docente_tecnico: ["Espera unos segundos.", "Actualiza una sola vez.", "Prueba otra red o dispositivo."],
};

function esTexto(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim().length > 0;
}

function normalizarPreguntas(valor: unknown): FaqPregunta[] {
  if (!Array.isArray(valor)) return [];
  return valor.flatMap((pregunta) => {
    if (!pregunta || typeof pregunta !== "object") return [];
    const dato = pregunta as { id?: unknown; pregunta?: unknown; opciones?: unknown };
    if (!esTexto(dato.id) || !esTexto(dato.pregunta) || !Array.isArray(dato.opciones)) return [];
    const opciones = dato.opciones.flatMap((opcion) => {
      if (!opcion || typeof opcion !== "object") return [];
      const datoOpcion = opcion as { id?: unknown; etiqueta?: unknown };
      return esTexto(datoOpcion.id) && esTexto(datoOpcion.etiqueta)
        ? [{ id: datoOpcion.id, etiqueta: datoOpcion.etiqueta }]
        : [];
    });
    return opciones.length ? [{ id: dato.id, pregunta: dato.pregunta, opciones }] : [];
  });
}

export function normalizarFaqArticulo(valor: unknown): FaqArticulo | null {
  if (!valor || typeof valor !== "object") return null;
  const dato = valor as FaqArticuloCrudo;
  if (!esTexto(dato.categoria) || !esTexto(dato.slug) || !esTexto(dato.titulo) || !esTexto(dato.resumen)) return null;
  const audiencia = dato.audiencia === "estudiante" || dato.audiencia === "docente" || dato.audiencia === "ambos" ? dato.audiencia : "ambos";
  const pasos = Array.isArray(dato.pasos) ? dato.pasos.filter(esTexto) : [];
  return {
    id: typeof dato.id === "string" ? dato.id : null,
    audiencia,
    categoria: dato.categoria,
    slug: dato.slug,
    titulo: dato.titulo,
    resumen: dato.resumen,
    pasos,
    preguntas: normalizarPreguntas(dato.preguntas),
  };
}

export function faqFallback(categoria: CategoriaReporte, audiencia: "estudiante" | "docente"): FaqArticulo | null {
  const pasos = PASOS_FALLBACK[categoria];
  if (!pasos) return null;
  return {
    id: null,
    audiencia,
    categoria,
    slug: `fallback-${categoria}`,
    titulo: "Orientación rápida",
    resumen: "Prueba estos pasos antes de enviar una solicitud.",
    pasos,
    preguntas: audiencia === "estudiante" ? PREGUNTAS_ESTUDIANTE[categoria] ?? [] : PREGUNTAS_DOCENTE[categoria] ?? [],
  };
}

export function idFaqValido(id: string | null): id is string {
  return Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));
}
