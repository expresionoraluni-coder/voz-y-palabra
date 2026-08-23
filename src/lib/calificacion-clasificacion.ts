export type ElementoClasificacion = { texto: string; categoria_correcta: string };
export type ElementoClasificacionPublico = { texto: string };

export type ContenidoClasificacion = {
  categorias: string[];
  elementos: ElementoClasificacion[];
  contexto?: string | null;
};

export type ContenidoClasificacionPublico = {
  categorias: string[];
  elementos: ElementoClasificacionPublico[];
  contexto?: string | null;
};

export function sanitizarContenidoClasificacion(contenido: ContenidoClasificacion): ContenidoClasificacionPublico {
  return {
    categorias: contenido.categorias,
    contexto: contenido.contexto,
    elementos: contenido.elementos.map((el) => ({ texto: el.texto })),
  };
}

export function calificarClasificacion(contenido: ContenidoClasificacion, elegidas: string[]) {
  const resultado = contenido.elementos.map((item, i) => item.categoria_correcta === elegidas[i]);
  const puntajeAuto = resultado.length === 0
    ? 0
    : Math.round((resultado.filter(Boolean).length / resultado.length) * 100);
  return { puntajeAuto, resultado };
}
