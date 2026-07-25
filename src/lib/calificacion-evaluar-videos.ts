export type ContenidoEvaluarVideos = {
  intro?: string | null;
  cualidades: string[];
  video_bien: { url: string | null; presentes: string[] };
  video_mal: { url: string | null; ausentes: string[] };
};

// Lo único que el cliente necesita para renderizar la actividad ANTES de
// contestar — sin `presentes`/`ausentes`, que son la clave de calificación.
export type ContenidoEvaluarVideosPublico = {
  intro?: string | null;
  cualidades: string[];
  video_bien: { url: string | null };
  video_mal: { url: string | null };
};

export function sanitizarContenidoEvaluarVideos(contenido: ContenidoEvaluarVideos): ContenidoEvaluarVideosPublico {
  return {
    intro: contenido.intro,
    cualidades: contenido.cualidades,
    video_bien: { url: contenido.video_bien.url },
    video_mal: { url: contenido.video_mal.url },
  };
}

// Calificación por coincidencia binaria: cada cualidad, en cada video,
// cuenta como acierto si su estado marcado (sí/no) coincide con el estado
// correcto — no es todo-o-nada por conjunto completo, así que marcar 5 de 6
// correctamente sí suma en vez de valer cero.
export function calificarVideos(contenido: ContenidoEvaluarVideos, marcadasBien: string[], marcadasMal: string[]) {
  const bien = contenido.cualidades.map(
    (c) => contenido.video_bien.presentes.includes(c) === marcadasBien.includes(c),
  );
  const mal = contenido.cualidades.map(
    (c) => contenido.video_mal.ausentes.includes(c) === marcadasMal.includes(c),
  );
  const aciertos = bien.filter(Boolean).length + mal.filter(Boolean).length;
  const puntajeAuto = Math.round((aciertos / (contenido.cualidades.length * 2)) * 100);
  return { puntajeAuto, resultado: { bien, mal } };
}
