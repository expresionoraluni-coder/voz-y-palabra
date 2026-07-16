import {
  ListTree,
  MessageSquareText,
  ScanSearch,
  Columns3,
  PenLine,
  Tags,
  Workflow,
  Mic,
  type LucideIcon,
} from "lucide-react";

export const ICONO_TIPO: Record<string, LucideIcon> = {
  opcion_justificacion: MessageSquareText,
  clasificacion: ListTree,
  encontrar_corregir: ScanSearch,
  comparador: Columns3,
  redaccion_checklist: PenLine,
  etiquetado_texto: Tags,
  constructor_ramificado: Workflow,
  grabacion_rubrica: Mic,
};
