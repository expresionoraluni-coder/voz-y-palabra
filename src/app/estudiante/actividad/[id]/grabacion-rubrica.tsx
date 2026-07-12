"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square, ShieldCheck, Timer, Waves } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Textarea, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import { analizarAudio, AnalisisAudio } from "@/lib/analisis-audio";

export default function GrabacionRubrica({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: { tema_sugerido: string; duracion_sugerida_segundos: number; rubrica: string[] };
  respuestaPrevia?: {
    autoevaluacion: Record<string, boolean>;
    reflexion: string;
    analisisAudio?: { duracionSegundos: number; numPausas: number; tiempoPausadoSegundos: number };
  };
}) {
  const router = useRouter();
  const [grabando, setGrabando] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [analisis, setAnalisis] = useState<AnalisisAudio | null>(null);
  const [errorMic, setErrorMic] = useState<string | null>(null);
  const [autoevaluacion, setAutoevaluacion] = useState<Record<string, boolean>>(
    respuestaPrevia?.autoevaluacion ?? Object.fromEntries(contenido.rubrica.map((r) => [r, false])),
  );
  const [reflexion, setReflexion] = useState(respuestaPrevia?.reflexion ?? "");
  const [cargando, setCargando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function iniciarGrabacion() {
    setErrorMic(null);
    setAnalisis(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());

        setAnalizando(true);
        analizarAudio(blob)
          .then(setAnalisis)
          .catch(() => setAnalisis(null))
          .finally(() => setAnalizando(false));
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setGrabando(true);
    } catch {
      setErrorMic("No pudimos acceder a tu micrófono. Revisa los permisos del navegador.");
    }
  }

  function detenerGrabacion() {
    mediaRecorderRef.current?.stop();
    setGrabando(false);
  }

  function alternar(criterio: string) {
    setAutoevaluacion((prev) => ({ ...prev, [criterio]: !prev[criterio] }));
  }

  const DURACION_MINIMA_SEGUNDOS = 8;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardado(false);

    const duracionActual = analisis?.duracionSegundos ?? respuestaPrevia?.analisisAudio?.duracionSegundos ?? 0;
    if (duracionActual < DURACION_MINIMA_SEGUNDOS) {
      setError(
        `Tu grabación es muy corta — graba al menos ${DURACION_MINIMA_SEGUNDOS} segundos antes de guardar.`,
      );
      return;
    }

    setCargando(true);

    const supabase = createClient();
    const { error: upsertError } = await supabase.from("entregas").upsert(
      {
        estudiante_id: estudianteId,
        actividad_id: actividadId,
        respuesta: {
          autoevaluacion,
          reflexion,
          analisisAudio: analisis
            ? {
                duracionSegundos: Math.round(analisis.duracionSegundos),
                numPausas: analisis.pausas.length,
                tiempoPausadoSegundos: Math.round(analisis.tiempoPausadoSegundos),
              }
            : respuestaPrevia?.analisisAudio,
        },
        estado: "completada",
      },
      { onConflict: "estudiante_id,actividad_id" },
    );

    if (upsertError) {
      setError(upsertError.message);
      setCargando(false);
      return;
    }

    setGuardado(true);
    setCargando(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {contenido.tema_sugerido}
        </p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Duración sugerida: ~{contenido.duracion_sugerida_segundos} segundos
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 px-6 py-8 dark:border-slate-800">
        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Se queda solo en tu navegador — nunca se sube a ningún lado
        </div>

        <button
          type="button"
          onClick={grabando ? detenerGrabacion : iniciarGrabacion}
          className={`relative flex size-16 items-center justify-center rounded-full text-white shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
            grabando
              ? "bg-red-600 shadow-red-600/30 focus-visible:ring-red-500"
              : "bg-indigo-600 shadow-indigo-600/30 hover:bg-indigo-700 focus-visible:ring-indigo-500"
          }`}
          aria-label={grabando ? "Detener grabación" : "Iniciar grabación"}
        >
          {grabando && (
            <span className="absolute inset-0 animate-ping rounded-full bg-red-500/50" aria-hidden="true" />
          )}
          {grabando ? (
            <Square className="size-6 fill-current" aria-hidden="true" />
          ) : (
            <Mic className="size-6" aria-hidden="true" />
          )}
        </button>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {grabando ? "Grabando..." : audioUrl ? "Toca para grabar de nuevo" : "Toca para grabar"}
        </p>

        {errorMic && <ErrorText>{errorMic}</ErrorText>}
        {audioUrl && (
          <audio controls src={audioUrl} className="w-full">
            Tu navegador no soporta audio.
          </audio>
        )}

        {analizando && <p className="text-xs text-slate-400 dark:text-slate-500">Analizando tu grabación...</p>}

        {analisis && (
          <div className="w-full rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Timer className="size-3.5" aria-hidden="true" />
                {Math.round(analisis.duracionSegundos)}s de grabación
              </span>
              <span className="flex items-center gap-1.5">
                <Waves className="size-3.5" aria-hidden="true" />
                {analisis.pausas.length === 0
                  ? "Sin pausas largas"
                  : `${analisis.pausas.length} ${analisis.pausas.length === 1 ? "pausa" : "pausas"} · ${Math.round(analisis.tiempoPausadoSegundos)}s en silencio`}
              </span>
            </div>
            {analisis.duracionSegundos > 0 && (
              <div className="relative mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-indigo-500">
                {analisis.pausas.map((p, i) => (
                  <span
                    key={i}
                    className="absolute inset-y-0 bg-slate-300 dark:bg-slate-600"
                    style={{
                      left: `${(p.inicio / analisis.duracionSegundos) * 100}%`,
                      width: `${((p.fin - p.inicio) / analisis.duracionSegundos) * 100}%`,
                    }}
                  />
                ))}
              </div>
            )}
            <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              Detectado automáticamente por volumen, sin escuchar ni guardar tu audio. Una pausa breve para
              respirar está bien — muchas pausas largas seguidas suelen indicar que conviene ensayar más.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5 rounded-xl border border-slate-200 px-4 py-3.5 dark:border-slate-800">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
          Escúchate y autoevalúate
        </p>
        {contenido.rubrica.map((criterio) => (
          <label key={criterio} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={autoevaluacion[criterio] ?? false}
              onChange={() => alternar(criterio)}
              className="size-4 rounded border-slate-300 accent-indigo-600 dark:border-slate-600"
            />
            {criterio}
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          ¿Qué te gustaría mejorar la próxima vez?
        </label>
        <Textarea value={reflexion} onChange={(e) => setReflexion(e.target.value)} rows={3} />
      </div>

      {error && <ErrorText>{error}</ErrorText>}
      {guardado && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Guardado. Tu grabación no se guarda en ningún lado — solo tu autoevaluación.
        </p>
      )}
      <Boton type="submit" cargando={cargando}>
        {cargando ? "Guardando..." : "Guardar mi autoevaluación"}
      </Boton>
    </form>
  );
}
