export type ContenidoOrdenarFragmentos = {
  contexto?: string | null;
  fragmentos: string[];
  orden_correcto: number[];
};

export type ContenidoOrdenarFragmentosPublico = {
  contexto?: string | null;
  fragmentos: string[];
};

export function sanitizarContenidoOrdenarFragmentos(
  contenido: ContenidoOrdenarFragmentos,
): ContenidoOrdenarFragmentosPublico {
  return { contexto: contenido.contexto, fragmentos: contenido.fragmentos };
}

// resultadoPorPosicion queda alineado con `secuencia` (la respuesta del
// estudiante), no con el orden original de `fragmentos` — así el
// componente puede pintar cada fragmento de su propia secuencia sin volver
// a necesitar `orden_correcto`.
export function calificarOrden(contenido: ContenidoOrdenarFragmentos, secuencia: number[]) {
  const resultadoPorPosicion = contenido.orden_correcto.map((idx, i) => secuencia[i] === idx);
  const puntajeAuto = Math.round(
    (resultadoPorPosicion.filter(Boolean).length / contenido.orden_correcto.length) * 100,
  );
  return { puntajeAuto, resultadoPorPosicion };
}
