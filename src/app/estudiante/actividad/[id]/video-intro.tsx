"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight, Video } from "lucide-react";
import Boton from "@/components/ui/button";
import { urlEmbedYoutube } from "@/lib/video-embed";

// El video es un paso previo y opcional, no un bloque mezclado con la
// actividad: se ve (o se salta) y solo después aparece el resto del
// contenido — así no compite por espacio con las preguntas.
export default function VideoIntro({
  videoUrl,
  titulo,
  children,
}: {
  videoUrl: string;
  titulo: string;
  children: ReactNode;
}) {
  const [avanzado, setAvanzado] = useState(false);

  if (avanzado) return <>{children}</>;

  const embed = urlEmbedYoutube(videoUrl);

  return (
    <div className="flex flex-col gap-4">
      {embed ? (
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-slate-900">
          <iframe
            src={embed}
            title={titulo}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="size-full"
          />
        </div>
      ) : (
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-indigo-600 hover:bg-slate-50 dark:border-slate-800 dark:text-indigo-400 dark:hover:bg-slate-800/50"
        >
          <Video className="size-4 shrink-0" aria-hidden="true" />
          Ver video
        </a>
      )}
      <Boton type="button" onClick={() => setAvanzado(true)} className="w-full">
        Continuar a la actividad
        <ChevronRight className="size-4" aria-hidden="true" />
      </Boton>
    </div>
  );
}
