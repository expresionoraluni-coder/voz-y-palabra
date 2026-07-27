import { rondasDeRespuesta } from "./opcion-justificacion";

type Respuesta = Record<string, unknown>;

export function resumenRespuesta(tipo: string | undefined, respuesta: Respuesta): string {
  switch (tipo) {
    case "opcion_justificacion": {
      const rondas = rondasDeRespuesta(respuesta);
      if (rondas.length <= 1) {
        const r = rondas[0];
        return r ? `Eligió "${r.opcion}". ${r.justificacion}` : "";
      }
      return rondas.map((r, i) => `Ronda ${i + 1}: eligió "${r.opcion}"`).join(" · ").slice(0, 300);
    }
    case "clasificacion":
    case "etiquetado_texto": {
      const elegidas = (respuesta.elegidas as string[]) ?? [];
      return `Clasificó ${elegidas.length} elemento(s).`;
    }
    case "encontrar_corregir":
      return `${respuesta.que_encontraste ?? ""} → ${respuesta.version_corregida ?? ""}`;
    case "corregir_ortografia":
      return (respuesta.texto_reescrito as string) ?? "";
    case "comparador":
      return "Completó la tabla de comparación.";
    case "redaccion_checklist":
      return (respuesta.texto as string) ?? "";
    case "constructor_ramificado": {
      const textos = (respuesta.textos as string[]) ?? [];
      return `Tema: ${respuesta.tema ?? ""}. ${textos.join(" ")}`.slice(0, 300);
    }
    case "ordenar_fragmentos": {
      const resultado = respuesta.resultadoPorPosicion as boolean[] | undefined;
      if (resultado?.length) {
        const aciertos = resultado.filter(Boolean).length;
        return `Ordenó los fragmentos: ${aciertos} de ${resultado.length} en la posición correcta.`;
      }
      const orden = (respuesta.orden as number[]) ?? [];
      return `Ordenó ${orden.length} fragmento(s).`;
    }
    case "evaluar_videos": {
      const bien = (respuesta.marcadas_bien as string[]) ?? [];
      const mal = (respuesta.marcadas_mal as string[]) ?? [];
      return `Marcó ${bien.length} cualidad(es) en el video que sí las respeta y ${mal.length} en el que no.`;
    }
    default:
      return JSON.stringify(respuesta);
  }
}
