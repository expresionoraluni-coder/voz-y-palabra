"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight, Video } from "lucide-react";
import Boton from "@/components/ui/button";
import { esVideoUrlPermitida, urlEmbedYoutube } from "@/lib/video-embed";

// El video es un paso previo, no un bloque mezclado con la actividad: se ve
// y solo después aparece el resto del contenido — así no compite por
// espacio con las preguntas. Este componente solo se monta cuando la
// actividad SÍ tiene video_url (ver page.tsx); si no lo tiene, se salta
// directo al contenido sin pasar por aquí.
export default function VideoIntro({
  videoUrl,
  titulo,
  instruccion,
  children,
}: {
  videoUrl: string;
  titulo: string;
  instruccion: string;
  children: ReactNode;
}) {
  const [avanzado, setAvanzado] = useState(false);

  if (avanzado) return <>{children}</>;

  const urlSegura = esVideoUrlPermitida(videoUrl) ? videoUrl : null;
  const embed = urlSegura ? urlEmbedYoutube(urlSegura) : null;

  return (
    <section
      aria-labelledby="momento-video-titulo"
      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">2</span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">Momento 2</p>
          <h2 id="momento-video-titulo" className="text-base font-semibold text-slate-900 dark:text-slate-50">Observa el video</h2>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{instruccion}</p>
      {embed ? (
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-slate-900">
          <iframe
            src={embed}
            title={titulo}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="size-full"
          />
        </div>
      ) : urlSegura ? (
        <a
          href={urlSegura}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-indigo-600 hover:bg-slate-50 dark:border-slate-800 dark:text-indigo-400 dark:hover:bg-slate-800/50"
        >
          <Video className="size-4 shrink-0" aria-hidden="true" />
          Ver video
        </a>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          Este video no tiene una dirección segura. Pide a la docente que lo revise.
        </p>
      )}
      <Boton type="button" onClick={() => setAvanzado(true)} className="w-full">
        Continuar al ejercicio
        <ChevronRight className="size-4" aria-hidden="true" />
      </Boton>
    </section>
  );
}
