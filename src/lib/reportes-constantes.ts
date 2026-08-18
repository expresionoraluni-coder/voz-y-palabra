export const CATEGORIAS_REPORTE = [
  ["acceso", "Tengo un problema de acceso"],
  ["actividad", "No puedo abrir o resolver una actividad"],
  ["avance", "No puedo avanzar"],
  ["video", "El video no carga"],
  ["carga", "La página está lenta o no responde"],
  ["contenido", "Hay un error en el contenido"],
  ["orientacion", "Tengo una duda sobre qué hacer"],
  ["otro", "Otro problema"],
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
