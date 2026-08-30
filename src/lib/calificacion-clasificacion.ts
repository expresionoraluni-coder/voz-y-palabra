export type ElementoClasificacion = { texto: string; categoria_correcta: string };
export type ElementoClasificacionPublico = { texto: string };

export type VarianteClasificacion = {
  categorias: string[];
  elementos: ElementoClasificacion[];
};

export type VarianteClasificacionPublica = {
  categorias: string[];
  elementos: ElementoClasificacionPublico[];
};

export type ContenidoClasificacion = {
  categorias: string[];
  elementos: ElementoClasificacion[];
  contexto?: string | null;
  reintento_alternativo?: VarianteClasificacion;
};

export type ContenidoClasificacionPublico = {
  categorias: string[];
  elementos: ElementoClasificacionPublico[];
  contexto?: string | null;
  reintento_alternativo?: VarianteClasificacionPublica;
};

export function sanitizarContenidoClasificacion(contenido: ContenidoClasificacion): ContenidoClasificacionPublico {
  return {
    categorias: contenido.categorias,
    contexto: contenido.contexto,
    elementos: contenido.elementos.map((el) => ({ texto: el.texto })),
    reintento_alternativo: contenido.reintento_alternativo
      ? {
          categorias: contenido.reintento_alternativo.categorias,
          elementos: contenido.reintento_alternativo.elementos.map((el) => ({ texto: el.texto })),
        }
      : undefined,
  };
}

export function calificarClasificacion(contenido: ContenidoClasificacion, elegidas: string[]) {
  const resultado = contenido.elementos.map((item, i) => item.categoria_correcta === elegidas[i]);
  const puntajeAuto = resultado.length === 0
    ? 0
    : Math.round((resultado.filter(Boolean).length / resultado.length) * 100);
  return { puntajeAuto, resultado };
}
