import { CheckCircle2, ListChecks, Video } from "lucide-react";

export default function ActividadOrientacion({
  tieneVideo,
  completada,
  aprendizajeEsperado,
  ayuda,
}: {
  tieneVideo: boolean;
  completada: boolean;
  aprendizajeEsperado?: string | null;
  ayuda?: string | null;
  }) {
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
          Lo que harás aquí
        </h2>
        {completada && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            Guardada
          </span>
        )}
      </div>
      {aprendizajeEsperado && (
        <div className="rounded-xl bg-white/70 px-3 py-2.5 dark:bg-slate-900/60">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Tu meta</p>
          <p className="mt-0.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{aprendizajeEsperado}</p>
        </div>
      )}
      <ol className="grid gap-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300 sm:grid-cols-3">
        <li className="flex items-start gap-2 rounded-xl bg-white/60 px-3 py-2.5 dark:bg-slate-900/45">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">1</span>
          <span>Revisa la consigna antes de responder.</span>
        </li>
        <li className="flex items-start gap-2 rounded-xl bg-white/60 px-3 py-2.5 dark:bg-slate-900/45">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">2</span>
          <span>Guarda tu respuesta cuando estés listo o lista.</span>
        </li>
        <li className="flex items-start gap-2 rounded-xl bg-white/60 px-3 py-2.5 dark:bg-slate-900/45">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">3</span>
          <span>Después de guardar, escribe una reflexión breve sobre tu proceso.</span>
        </li>
      </ol>
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
