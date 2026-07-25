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

// Mismo itemsSnapshot que ya se guardaba antes de este cambio (lo usa la
// matriz de confusión docente) — ahora también es lo único que el
// estudiante lee de vuelta para pintar "Era: X" tras calificar.
export function calificarClasificacion(contenido: ContenidoClasificacion, elegidas: string[]) {
  const itemsSnapshot = contenido.elementos.map((el) => ({ texto: el.texto, correcta: el.categoria_correcta }));
  const aciertos = itemsSnapshot.map((item, i) => item.correcta === elegidas[i]);
  const puntajeAuto = Math.round((aciertos.filter(Boolean).length / itemsSnapshot.length) * 100);
  return { puntajeAuto, itemsSnapshot };
}
