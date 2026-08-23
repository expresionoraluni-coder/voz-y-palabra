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

export function calificarEtiquetado(contenido: ContenidoEtiquetadoTexto, elegidas: string[]) {
  const resultado = contenido.fragmentos.map((fragmento, i) => fragmento.etiqueta_correcta === elegidas[i]);
  const puntajeAuto = resultado.length === 0
    ? 0
    : Math.round((resultado.filter(Boolean).length / resultado.length) * 100);
  return { puntajeAuto, resultado };
}
