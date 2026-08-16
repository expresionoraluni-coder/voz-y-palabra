"use client";

import { useState, useTransition } from "react";
import { Check, ExternalLink, Trash2, Video } from "lucide-react";
import Boton from "@/components/ui/button";
import { ErrorText, HelpText, Input, Label } from "@/components/ui/field";
import { guardarVideoActividad } from "./acciones-actividad";

export default function ActividadVideoEditor({
  actividadId,
  unidadId,
  videoUrlInicial,
}: {
  actividadId: string;
  unidadId: string;
  videoUrlInicial: string | null;
}) {
  const [videoUrl, setVideoUrl] = useState(videoUrlInicial ?? "");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, startTransition] = useTransition();

  function guardar(url: string) {
    setError(null);
    setMensaje(null);
    startTransition(async () => {
      const resultado = await guardarVideoActividad(actividadId, unidadId, url);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setVideoUrl(url.trim());
      setMensaje(url.trim() ? "Enlace guardado." : "Video eliminado.");
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex items-center gap-2">
        <Video className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <Label htmlFor={`video-${actividadId}`}>Video de apoyo en YouTube</Label>
      </div>
      <HelpText>
        Pega un enlace de YouTube. El estudiante lo verá antes de resolver la actividad. Puedes usar un video público o no listado.
      </HelpText>
      <Input
        id={`video-${actividadId}`}
        value={videoUrl}
        onChange={(event) => {
          setVideoUrl(event.target.value);
          setMensaje(null);
          setError(null);
        }}
        placeholder="https://www.youtube.com/watch?v=..."
        inputMode="url"
        autoComplete="url"
        aria-describedby={`video-ayuda-${actividadId}`}
      />
      <p id={`video-ayuda-${actividadId}`} className="text-xs text-slate-500 dark:text-slate-400">
        También se aceptan enlaces youtu.be, /shorts/ y /embed/.
      </p>
      {error && <ErrorText>{error}</ErrorText>}
      {mensaje && (
        <p role="status" className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
          <Check className="size-4" aria-hidden="true" />
          {mensaje}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Boton type="button" size="sm" onClick={() => guardar(videoUrl)} cargando={guardando} disabled={!videoUrl.trim()}>
          Guardar video
        </Boton>
        {videoUrl.trim() && (
          <>
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-indigo-600 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-400 dark:hover:bg-slate-900"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              Abrir enlace
            </a>
            <Boton type="button" variant="ghost" size="sm" onClick={() => guardar("")} cargando={guardando}>
              <Trash2 className="size-3.5" aria-hidden="true" />
              Quitar video
            </Boton>
          </>
        )}
      </div>
    </div>
  );
}
