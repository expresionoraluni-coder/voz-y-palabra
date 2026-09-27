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
      className="relative flex flex-col gap-4 overflow-hidden rounded-[1.5rem] border border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/70 p-5 shadow-[0_12px_26px_-22px_rgb(79_70_229/0.45)] dark:border-indigo-900/70 dark:from-indigo-950/40 dark:via-slate-900 dark:to-violet-950/25"
    >
      <div aria-hidden="true" className="absolute -right-10 -top-10 size-32 rounded-full bg-violet-200/40 blur-2xl dark:bg-violet-800/20" />
      <div className="relative flex items-center gap-2">
        {tieneVideo ? (
          <Video className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        ) : (
          <ListChecks className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        )}
        <h2 id="orientacion-actividad" className="text-base font-bold text-slate-900 dark:text-slate-50">
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
        <div className="relative rounded-2xl border border-white/70 bg-white/75 px-4 py-3 backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-900/60">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-700 dark:text-indigo-300">Tu meta</p>
          <p className="mt-0.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{aprendizajeEsperado}</p>
        </div>
      )}
      <ol className="relative grid gap-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300 sm:grid-cols-3">
        <li className="flex items-start gap-2.5 rounded-2xl border border-white/70 bg-white/65 px-3.5 py-3 dark:border-slate-800/70 dark:bg-slate-900/45">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm">1</span>
          <span>Revisa la consigna antes de responder.</span>
        </li>
        <li className="flex items-start gap-2.5 rounded-2xl border border-white/70 bg-white/65 px-3.5 py-3 dark:border-slate-800/70 dark:bg-slate-900/45">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm">2</span>
          <span>Guarda tu respuesta cuando estés listo o lista.</span>
        </li>
        <li className="flex items-start gap-2.5 rounded-2xl border border-white/70 bg-white/65 px-3.5 py-3 dark:border-slate-800/70 dark:bg-slate-900/45">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm">3</span>
          <span>Después de guardar, escribe una reflexión breve sobre tu proceso.</span>
        </li>
      </ol>
      {ayuda && (
        <details className="relative rounded-2xl border border-amber-100 bg-amber-50/85 px-4 py-3 text-sm dark:border-amber-900/70 dark:bg-amber-950/30">
          <summary className="cursor-pointer font-semibold text-amber-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-amber-100">
            ¿Te atoraste? Ver una pista
          </summary>
          <p className="mt-2 leading-relaxed text-amber-900/80 dark:text-amber-100/80">{ayuda}</p>
        </details>
      )}
    </section>
  );
}
