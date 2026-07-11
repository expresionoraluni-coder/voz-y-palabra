export type AnalisisAudio = {
  duracionSegundos: number;
  pausas: { inicio: number; fin: number }[];
  tiempoPausadoSegundos: number;
};

const TAMANO_VENTANA_SEGUNDOS = 0.05;
const UMBRAL_RELATIVO = 0.08;
const PAUSA_MINIMA_SEGUNDOS = 0.5;

/**
 * Analiza un audio grabado enteramente en el navegador (nunca se sube a
 * ningún lado): detecta segmentos de silencio sostenido por amplitud, sin
 * transcripción ni IA.
 */
export async function analizarAudio(blob: Blob): Promise<AnalisisAudio> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioContextCtor =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioContextCtor();

  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const datos = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const tamanoVentana = Math.max(1, Math.floor(sampleRate * TAMANO_VENTANA_SEGUNDOS));

    const ventanas: number[] = [];
    for (let i = 0; i < datos.length; i += tamanoVentana) {
      const fin = Math.min(i + tamanoVentana, datos.length);
      let suma = 0;
      for (let j = i; j < fin; j++) suma += datos[j] * datos[j];
      ventanas.push(Math.sqrt(suma / (fin - i)));
    }

    const pico = Math.max(...ventanas, 0.0001);
    const umbral = pico * UMBRAL_RELATIVO;
    const minPausaVentanas = Math.round(PAUSA_MINIMA_SEGUNDOS / TAMANO_VENTANA_SEGUNDOS);

    const pausas: { inicio: number; fin: number }[] = [];
    let inicioSilencio: number | null = null;
    ventanas.forEach((v, i) => {
      if (v < umbral) {
        if (inicioSilencio === null) inicioSilencio = i;
      } else if (inicioSilencio !== null) {
        if (i - inicioSilencio >= minPausaVentanas) {
          pausas.push({ inicio: inicioSilencio * TAMANO_VENTANA_SEGUNDOS, fin: i * TAMANO_VENTANA_SEGUNDOS });
        }
        inicioSilencio = null;
      }
    });
    if (inicioSilencio !== null && ventanas.length - inicioSilencio >= minPausaVentanas) {
      pausas.push({
        inicio: inicioSilencio * TAMANO_VENTANA_SEGUNDOS,
        fin: ventanas.length * TAMANO_VENTANA_SEGUNDOS,
      });
    }

    const tiempoPausadoSegundos = pausas.reduce((s, p) => s + (p.fin - p.inicio), 0);

    return { duracionSegundos: audioBuffer.duration, pausas, tiempoPausadoSegundos };
  } finally {
    ctx.close();
  }
}
