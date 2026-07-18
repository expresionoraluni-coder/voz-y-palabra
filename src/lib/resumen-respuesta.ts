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
    case "comparador":
      return "Completó la tabla de comparación.";
    case "redaccion_checklist":
      return (respuesta.texto as string) ?? "";
    case "constructor_ramificado": {
      const textos = (respuesta.textos as string[]) ?? [];
      return `Tema: ${respuesta.tema ?? ""}. ${textos.join(" ")}`.slice(0, 300);
    }
    default:
      return JSON.stringify(respuesta);
  }
}
