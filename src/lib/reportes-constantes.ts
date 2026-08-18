export const CATEGORIAS_REPORTE_ESTUDIANTE = [
  ["estudiante_acceso", "No puedo entrar"],
  ["estudiante_actividad", "No puedo completar una actividad"],
  ["estudiante_avance", "No puedo continuar"],
  ["estudiante_instruccion", "No entiendo qué hacer"],
  ["estudiante_video", "El video no funciona"],
  ["estudiante_tecnico", "La página no responde"],
  ["estudiante_contenido", "Hay algo incorrecto en el contenido"],
  ["estudiante_otro", "Otro problema"],
] as const;

export const CATEGORIAS_REPORTE_DOCENTE = [
  ["docente_acceso", "No puedo entrar al panel"],
  ["docente_grupo", "Tengo un problema con un grupo"],
  ["docente_estudiantes", "Problema con estudiantes o NIP"],
  ["docente_actividad", "Crear o editar una actividad"],
  ["docente_seguimiento", "No veo bien el avance del grupo"],
  ["docente_video", "Tengo un problema con un video"],
  ["docente_tecnico", "La página no responde"],
  ["docente_otro", "Otro problema"],
] as const;

// Se conservan para que la bandeja administrativa pueda mostrar casos
// históricos si existieran; ya no aparecen en los formularios de ayuda.
export const CATEGORIAS_REPORTE_LEGACY = [
  ["acceso", "Problema de acceso (anterior)"],
  ["actividad", "Actividad (anterior)"],
  ["avance", "Avance (anterior)"],
  ["video", "Video (anterior)"],
  ["carga", "Carga (anterior)"],
  ["contenido", "Contenido (anterior)"],
  ["orientacion", "Orientación (anterior)"],
  ["otro", "Otro problema (anterior)"],
] as const;

export const CATEGORIAS_REPORTE = [
  ...CATEGORIAS_REPORTE_ESTUDIANTE,
  ...CATEGORIAS_REPORTE_DOCENTE,
  ...CATEGORIAS_REPORTE_LEGACY,
] as const;

export type CategoriaReporte = (typeof CATEGORIAS_REPORTE)[number][0];

export const ETIQUETAS_CATEGORIA: Record<string, string> = Object.fromEntries(CATEGORIAS_REPORTE);

export const ESTADOS_REPORTE: Record<string, string> = {
  recibido: "Recibido",
  en_revision: "En revisión",
  necesita_informacion: "Necesita información",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
};

export const PRIORIDADES_REPORTE: Record<string, string> = {
  baja: "Baja",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};
