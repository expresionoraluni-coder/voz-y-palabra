"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function GrabacionRubrica({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: { tema_sugerido: string; duracion_sugerida_segundos: number; rubrica: string[] };
  respuestaPrevia?: { autoevaluacion: Record<string, boolean>; reflexion: string };
}) {
  const router = useRouter();
  const [grabando, setGrabando] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardado(false);
    setCargando(true);

    const supabase = createClient();
    const { error: upsertError } = await supabase.from("entregas").upsert(
      {
        estudiante_id: estudianteId,
        actividad_id: actividadId,
        respuesta: { autoevaluacion, reflexion },
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-zinc-700 dark:text-zinc-300">{contenido.tema_sugerido}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        Duración sugerida: ~{contenido.duracion_sugerida_segundos} segundos.
      </p>

      <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Graba tu voz (queda solo en tu navegador, nunca se sube a ningún lado)
        </p>
        <div className="flex items-center gap-3">
          {!grabando ? (
            <button
              type="button"
              onClick={iniciarGrabacion}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white"
            >
              ● Grabar
            </button>
          ) : (
            <button
              type="button"
              onClick={detenerGrabacion}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
            >
              ■ Detener
            </button>
          )}
          {grabando && <span className="text-sm text-red-600">Grabando...</span>}
        </div>
        {errorMic && <p className="text-sm text-red-600 dark:text-red-400">{errorMic}</p>}
        {audioUrl && (
          <audio controls src={audioUrl} className="w-full">
            Tu navegador no soporta audio.
          </audio>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Escúchate y autoevalúate
        </p>
        {contenido.rubrica.map((criterio) => (
          <label key={criterio} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" checked={autoevaluacion[criterio] ?? false} onChange={() => alternar(criterio)} />
            {criterio}
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-zinc-600 dark:text-zinc-400">
          ¿Qué te gustaría mejorar la próxima vez?
        </label>
        <textarea
          value={reflexion}
          onChange={(e) => setReflexion(e.target.value)}
          rows={3}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {guardado && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Guardado. Tu grabación no se guarda en ningún lado — solo tu autoevaluación.
        </p>
      )}
      <button
        type="submit"
        disabled={cargando}
        className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {cargando ? "Guardando..." : "Guardar mi autoevaluación"}
      </button>
    </form>
  );
}
