import { CheckCircle2, KeyRound } from "lucide-react";

type ActividadCierre = {
  id: string;
  titulo: string;
  contenido: unknown;
  tipos_actividad: { nombre: string } | { nombre: string }[] | null;
};

type RespuestaCorrecta = {
  titulo: string;
  tipo: string;
  respuestas: string[];
};

function registro(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? valor as Record<string, unknown>
    : {};
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

function nombreTipo(actividad: ActividadCierre): string {
  const tipo = Array.isArray(actividad.tipos_actividad) ? actividad.tipos_actividad[0] : actividad.tipos_actividad;
  return tipo?.nombre ?? "";
}

function prepararRespuesta(actividad: ActividadCierre): RespuestaCorrecta {
  const contenido = registro(actividad.contenido);
  const tipo = nombreTipo(actividad);

  if (tipo === "clasificacion") {
    const elementos = Array.isArray(contenido.elementos) ? contenido.elementos : [];
    return {
      titulo: actividad.titulo,
      tipo,
      respuestas: elementos.map((elemento) => {
        const item = registro(elemento);
        return `${texto(item.texto)} → ${texto(item.categoria_correcta)}`;
      }),
    };
  }

  if (tipo === "corregir_ortografia") {
    return {
      titulo: actividad.titulo,
      tipo,
      respuestas: [texto(contenido.texto_correcto)],
    };
  }

  if (tipo === "opcion_justificacion") {
    const rondas = Array.isArray(contenido.rondas) ? contenido.rondas : [];
    return {
      titulo: actividad.titulo,
      tipo,
      respuestas: rondas.map((ronda) => {
        const item = registro(ronda);
        return `${texto(item.pregunta)} → ${texto(item.respuesta_correcta)}`;
      }),
    };
  }

  if (tipo === "etiquetado_texto") {
    const fragmentos = Array.isArray(contenido.fragmentos) ? contenido.fragmentos : [];
    return {
      titulo: actividad.titulo,
      tipo,
      respuestas: fragmentos.map((fragmento) => {
        const item = registro(fragmento);
        return `${texto(item.texto)} → ${texto(item.etiqueta_correcta)}`;
      }),
    };
  }

  if (tipo === "ordenar_fragmentos") {
    const fragmentos = Array.isArray(contenido.fragmentos) ? contenido.fragmentos.map(texto) : [];
    const orden = Array.isArray(contenido.orden_correcto) ? contenido.orden_correcto : [];
    return {
      titulo: actividad.titulo,
      tipo,
      respuestas: [orden.map((indice) => fragmentos[Number(indice)] ?? "").filter(Boolean).join(" ")],
    };
  }

  if (tipo === "comparador") {
    const conceptos = Array.isArray(contenido.conceptos) ? contenido.conceptos.map(texto) : [];
    const criterios = Array.isArray(contenido.criterios) ? contenido.criterios.map(texto) : [];
    const celdas = Array.isArray(contenido.celda_correcta) ? contenido.celda_correcta : [];
    return {
      titulo: actividad.titulo,
      tipo,
      respuestas: celdas.flatMap((fila, i) =>
        Array.isArray(fila)
          ? fila.map((valor, j) => `${criterios[i] ?? "Criterio"} / ${conceptos[j] ?? "Concepto"} → ${texto(valor)}`)
          : [],
      ),
    };
  }

  if (tipo === "evaluar_videos") {
    const videoBien = registro(contenido.video_bien);
    const videoMal = registro(contenido.video_mal);
    return {
      titulo: actividad.titulo,
      tipo,
      respuestas: [
        `Video A: presentes → ${Array.isArray(videoBien.presentes) ? videoBien.presentes.map(texto).join(", ") : "ninguna"}`,
        `Video B: ausentes → ${Array.isArray(videoMal.ausentes) ? videoMal.ausentes.map(texto).join(", ") : "ninguna"}`,
      ],
    };
  }

  return {
    titulo: actividad.titulo,
    tipo,
    respuestas: ["No hay una única respuesta correcta; revisa tu texto con el propósito y la lista de criterios de la actividad."],
  };
}

const ETIQUETAS_TIPO: Record<string, string> = {
  clasificacion: "Clasificación",
  corregir_ortografia: "Corrección ortográfica",
  opcion_justificacion: "Opción y justificación",
  etiquetado_texto: "Etiquetado de texto",
  ordenar_fragmentos: "Orden de fragmentos",
  comparador: "Comparación",
  evaluar_videos: "Evaluación de videos",
  redaccion_checklist: "Redacción",
};

export default function RespuestasCorrectas({ actividades }: { actividades: ActividadCierre[] }) {
  const respuestas = actividades.map(prepararRespuesta);

  return (
    <section
      aria-labelledby="respuestas-correctas"
      className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900 dark:bg-amber-950/25"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm dark:bg-slate-900 dark:text-amber-300">
          <KeyRound className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id="respuestas-correctas" className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Respuestas correctas de la unidad
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            Ya terminaste las actividades. Revisa estas respuestas para comparar tu proceso y detectar qué conviene repasar.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {respuestas.map((respuesta) => (
          <details key={respuesta.titulo} className="rounded-xl border border-amber-200 bg-white/80 px-3.5 py-3 dark:border-amber-900 dark:bg-slate-900/70">
            <summary className="cursor-pointer list-none font-medium text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-50">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                {respuesta.titulo}
              </span>
              <span className="mt-1 block text-xs font-normal text-slate-500 dark:text-slate-400">
                {ETIQUETAS_TIPO[respuesta.tipo] ?? "Actividad"}
              </span>
            </summary>
            <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {respuesta.respuestas.filter(Boolean).map((item, indice) => (
                <li key={`${respuesta.titulo}-${indice}`} className="whitespace-pre-line">{item}</li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
  );
}
