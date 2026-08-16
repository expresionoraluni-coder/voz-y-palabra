"use client";

import { useState } from "react";
import { CheckCircle2, Video, XCircle } from "lucide-react";
import { useEntregaActividad } from "@/hooks/useEntregaActividad";
import { ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import AvisoReintento from "@/components/estudiante/aviso-reintento";
import { useIntentosAuto } from "@/hooks/useIntentosAuto";
import EmptyState from "@/components/ui/empty-state";
import { esVideoUrlPermitida, urlEmbedYoutube } from "@/lib/video-embed";
import type { ContenidoEvaluarVideosPublico } from "@/lib/calificacion-evaluar-videos";
import { calificarEvaluarVideos } from "./acciones-calificacion";

function BloqueVideo({ titulo, descripcion, url }: { titulo: string; descripcion: string; url: string | null }) {
  const urlSegura = url && esVideoUrlPermitida(url) ? url : null;
  const embed = urlSegura ? urlEmbedYoutube(urlSegura) : null;
  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{titulo}</p>
        <p className="text-xs text-slate-500 dark:text-slate-500">{descripcion}</p>
      </div>
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
      ) : url ? (
        <EmptyState icon={Video} titulo="Video no disponible" descripcion="La dirección del video necesita revisión." />
      ) : (
        <EmptyState icon={Video} titulo="Video próximamente" descripcion="Aparecerá cuando el curso lo tenga disponible." />
      )}
    </div>
  );
}

export default function EvaluarVideos({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
  puntajeAuto,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: ContenidoEvaluarVideosPublico;
  respuestaPrevia?: { marcadas_bien: string[]; marcadas_mal: string[]; resultado?: { bien: boolean[]; mal: boolean[] } };
  puntajeAuto?: number | null;
}) {
  const { cargando, error, setError, guardarConAccion } = useEntregaActividad(actividadId, estudianteId);
  const { intentos, mejorPuntaje, registrarEntrega } = useIntentosAuto(
    respuestaPrevia,
    puntajeAuto ?? null,
    Boolean(respuestaPrevia),
  );
  const [marcadasBien, setMarcadasBien] = useState<string[]>(respuestaPrevia?.marcadas_bien ?? []);
  const [marcadasMal, setMarcadasMal] = useState<string[]>(respuestaPrevia?.marcadas_mal ?? []);
  // El detalle de aciertos/fallos ya se calificó en el servidor al entregar
  // (ver acciones-calificacion.ts) y se guardó junto a la respuesta — aquí
  // solo se lee, nunca se recalcula (la clave ya no llega al cliente). Si la
  // entrega es de antes de este cambio y no trae `resultado`, se trata como
  // si no hubiera entrega todavía en vez de tronar.
  const [resultado, setResultado] = useState<{ bien: boolean[]; mal: boolean[] } | null>(
    respuestaPrevia?.resultado ?? null,
  );
  const bloqueado = resultado !== null;

  function alternar(lista: "bien" | "mal", cualidad: string) {
    if (bloqueado) return;
    const set = lista === "bien" ? setMarcadasBien : setMarcadasMal;
    set((prev) => (prev.includes(cualidad) ? prev.filter((c) => c !== cualidad) : [...prev, cualidad]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (bloqueado) return;
    setError(null);

    const guardada = await guardarConAccion(() => calificarEvaluarVideos(actividadId, marcadasBien, marcadasMal));
    if (guardada) {
      setResultado(guardada.resultado as { bien: boolean[]; mal: boolean[] });
      registrarEntrega(guardada);
    }
  }

  function iniciarReintento() {
    setError(null);
    setResultado(null);
    setMarcadasBien([]);
    setMarcadasMal([]);
  }

  function checklist(lista: "bien" | "mal", marcadas: string[], resultadoLista?: boolean[]) {
    return (
      <div className="flex flex-col gap-2">
        {contenido.cualidades.map((c, i) => (
          <label key={c} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={marcadas.includes(c)}
              disabled={bloqueado}
              onChange={() => alternar(lista, c)}
              className="size-4 shrink-0 rounded border-slate-300 accent-indigo-600 dark:border-slate-600"
            />
            <span className="flex-1">{c}</span>
            {resultadoLista &&
              (resultadoLista[i] ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              ) : (
                <XCircle className="size-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
              ))}
          </label>
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {contenido.intro && <p className="text-sm text-slate-500 dark:text-slate-500">{contenido.intro}</p>}

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 px-4 py-3.5 dark:border-slate-800">
        <BloqueVideo
          titulo="Video A"
          descripcion="Observa si respeta las cualidades de la exposición oral."
          url={contenido.video_bien.url}
        />
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
          Marca las cualidades que sí identificas en este video
        </p>
        {checklist("bien", marcadasBien, resultado?.bien)}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 px-4 py-3.5 dark:border-slate-800">
        <BloqueVideo titulo="Video B" descripcion="Observa qué cualidades no respeta." url={contenido.video_mal.url} />
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
          Marca las cualidades que le hacen falta a este video
        </p>
        {checklist("mal", marcadasMal, resultado?.mal)}
      </div>

      {error && <ErrorText>{error}</ErrorText>}
      {!bloqueado && (
        <Boton type="submit" cargando={cargando}>
          {cargando ? "Guardando..." : "Guardar y revisar"}
        </Boton>
      )}
      {bloqueado && (
        <AvisoReintento
          puntaje={mejorPuntaje}
          intentos={intentos}
          onReintentar={iniciarReintento}
          cargando={cargando}
        />
      )}
    </form>
  );
}
