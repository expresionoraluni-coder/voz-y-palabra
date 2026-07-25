export type FragmentoEtiquetado = { texto: string; etiqueta_correcta: string; opciones?: string[] };
export type FragmentoEtiquetadoPublico = { texto: string; opciones?: string[] };

export type ContenidoEtiquetadoTexto = {
  contexto: string | null;
  etiquetas: string[];
  fragmentos: FragmentoEtiquetado[];
  en_linea?: boolean;
};

export type ContenidoEtiquetadoTextoPublico = {
  contexto: string | null;
  etiquetas: string[];
  fragmentos: FragmentoEtiquetadoPublico[];
  en_linea?: boolean;
};

export function sanitizarContenidoEtiquetadoTexto(
  contenido: ContenidoEtiquetadoTexto,
): ContenidoEtiquetadoTextoPublico {
  return {
    contexto: contenido.contexto,
    etiquetas: contenido.etiquetas,
    en_linea: contenido.en_linea,
    fragmentos: contenido.fragmentos.map((f) => ({ texto: f.texto, opciones: f.opciones })),
  };
}

// itemsSnapshot (texto + etiqueta correcta) se guarda igual que ya hacía el
// cliente antes de este cambio — es el mecanismo ya usado por la matriz de
// confusión docente, y ahora también es lo único que el estudiante lee de
// vuelta para pintar "Era: X" tras calificar, sin volver a necesitar la
// clave completa del contenido.
export function calificarEtiquetado(contenido: ContenidoEtiquetadoTexto, elegidas: string[]) {
  const itemsSnapshot = contenido.fragmentos.map((f) => ({ texto: f.texto, correcta: f.etiqueta_correcta }));
  const aciertos = itemsSnapshot.map((item, i) => item.correcta === elegidas[i]);
  const puntajeAuto = Math.round((aciertos.filter(Boolean).length / itemsSnapshot.length) * 100);
  return { puntajeAuto, itemsSnapshot };
}
