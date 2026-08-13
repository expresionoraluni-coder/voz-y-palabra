import { CheckCircle2, ListChecks, Video } from "lucide-react";

export default function ActividadOrientacion({
  nombreTipo,
  tieneVideo,
  completada,
  aprendizajeEsperado,
  ayuda,
}: {
  nombreTipo?: string;
  tieneVideo: boolean;
  completada: boolean;
  aprendizajeEsperado?: string | null;
  ayuda?: string | null;
}) {
  const esRedaccion = nombreTipo === "redaccion_checklist" || nombreTipo === "redaccion_lectura";
  const esGrabacion = nombreTipo === "grabacion_rubrica";
  const pasos = esGrabacion
    ? ["Revisa el tema y la rúbrica", "Graba tu participación con calma", "Escúchate y guarda tu autoevaluación"]
    : esRedaccion
      ? ["Lee el texto o ejemplo de referencia", "Escribe con tus propias palabras", "Revisa tu respuesta antes de guardarla"]
      : ["Lee la instrucción completa", "Responde paso a paso", "Revisa tu respuesta antes de guardarla"];

  return (
    <section
      aria-labelledby="orientacion-actividad"
      className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3.5 dark:border-indigo-900 dark:bg-indigo-950/30"
    >
      <div className="flex items-center gap-2">
        {tieneVideo ? (
          <Video className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        ) : (
          <ListChecks className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        )}
        <h2 id="orientacion-actividad" className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          Cómo trabajarla
        </h2>
        {completada && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            Guardada
          </span>
        )}
      </div>
      <ol className="grid gap-2 text-sm text-slate-700 dark:text-slate-300 sm:grid-cols-3">
        {pasos.map((paso, index) => (
          <li key={paso} className="flex items-start gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400">
              {index + 1}
            </span>
            <span>{paso}</span>
          </li>
        ))}
      </ol>
      {aprendizajeEsperado && (
        <div className="rounded-xl bg-white/70 px-3 py-2.5 dark:bg-slate-900/60">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Al terminar podrás</p>
          <p className="mt-0.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{aprendizajeEsperado}</p>
        </div>
      )}
      {ayuda && (
        <details className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm dark:bg-amber-950/30">
          <summary className="cursor-pointer font-semibold text-amber-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-amber-100">
            ¿Te atoraste? Ver una pista
          </summary>
          <p className="mt-2 leading-relaxed text-amber-900/80 dark:text-amber-100/80">{ayuda}</p>
        </details>
      )}
    </section>
  );
}
