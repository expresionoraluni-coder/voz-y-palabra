import {
  ListTree,
  MessageSquareText,
  Columns3,
  PenLine,
  Tags,
  ArrowUpDown,
  Video,
  SpellCheck,
  type LucideIcon,
} from "lucide-react";

export const ICONO_TIPO: Record<string, LucideIcon> = {
  opcion_justificacion: MessageSquareText,
  clasificacion: ListTree,
  comparador: Columns3,
  redaccion_checklist: PenLine,
  etiquetado_texto: Tags,
  ordenar_fragmentos: ArrowUpDown,
  evaluar_videos: Video,
  corregir_ortografia: SpellCheck,
};

export const ETIQUETA_TIPO: Record<string, string> = {
  opcion_justificacion: "Opción y justificación",
  clasificacion: "Clasificar elementos",
  comparador: "Comparar conceptos",
  redaccion_checklist: "Redacción con checklist",
  etiquetado_texto: "Etiquetar un texto",
  ordenar_fragmentos: "Ordenar fragmentos",
  evaluar_videos: "Evaluar videos",
  corregir_ortografia: "Corregir ortografía",
};

export const DESCRIPCION_TIPO: Record<string, string> = {
  opcion_justificacion: "Presenta una situación, varias opciones y una explicación para elegir.",
  clasificacion: "Organiza elementos en categorías y comprueba la decisión de cada estudiante.",
  comparador: "Relaciona conceptos con criterios para distinguir sus diferencias.",
  redaccion_checklist: "Escribe un texto y revisa si cumple criterios concretos.",
  etiquetado_texto: "Identifica partes o funciones dentro de un texto.",
  ordenar_fragmentos: "Reconstruye un texto colocando sus fragmentos en orden.",
  evaluar_videos: "Compara dos videos y reconoce cualidades presentes o ausentes.",
  corregir_ortografia: "Reescribe un texto y observa las diferencias con la versión correcta.",
};

export function etiquetaTipo(nombre: string | null | undefined) {
  return (nombre && ETIQUETA_TIPO[nombre]) || nombre?.replaceAll("_", " ") || "Actividad";
}
