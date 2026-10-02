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
// estudiante). Cada distractor, repetición o fragmento fuera de lugar cuenta
// como un error; los fragmentos omitidos también se reflejan en el total.
export function calificarOrden(contenido: ContenidoOrdenarFragmentos, secuencia: number[]) {
  const resultadoPorPosicion = secuencia.map((idx, i) => secuencia[i] === contenido.orden_correcto[i]);
  const total = Math.max(contenido.orden_correcto.length, secuencia.length);
  const puntajeAuto = Math.round(
    total === 0 ? 0 : (resultadoPorPosicion.filter(Boolean).length / total) * 100,
  );
  return { puntajeAuto, resultadoPorPosicion };
}
