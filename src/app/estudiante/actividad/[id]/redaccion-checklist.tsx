"use client";

import { useMemo, useState } from "react";
import { ListChecks, Lightbulb, Sparkles } from "lucide-react";
import { useEntregaActividad } from "@/hooks/useEntregaActividad";
import { Textarea, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import { analizarTexto, overlapConFuente } from "@/lib/analisis-texto";
import { contarPalabras } from "@/lib/contar-palabras";
import { bloquearCopiar, bloquearPegado } from "@/lib/anti-copiar";

export default function RedaccionChecklist({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: {
    texto_fuente: string | null;
    titulo_fuente?: string | null;
    ejemplos_resueltos?: string | null;
    limite_palabras: number;
    checklist: string[];
  };
  respuestaPrevia?: { texto: string; checklist_marcado: boolean[] };
}) {
  const { cargando, guardado, error, setError, guardar, marcarSinGuardar } = useEntregaActividad(actividadId, estudianteId);
  const [texto, setTexto] = useState(respuestaPrevia?.texto ?? "");
  const [marcado, setMarcado] = useState<boolean[]>(
    respuestaPrevia?.checklist_marcado ?? contenido.checklist.map(() => false),
  );
  const [mostrarEjemplos, setMostrarEjemplos] = useState(false);

  const palabras = contarPalabras(texto);
  const excedido = palabras > contenido.limite_palabras;
  const minimoPalabras = Math.max(15, Math.round(contenido.limite_palabras * 0.5));
  const muyCorto = palabras < minimoPalabras;
  const analisis = useMemo(() => analizarTexto(texto), [texto]);
  const overlap = useMemo(
    () => (contenido.texto_fuente ? overlapConFuente(contenido.texto_fuente, texto) : null),
    [contenido.texto_fuente, texto],
  );

  function alternar(i: number) {
    setMarcado((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
    marcarSinGuardar();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (muyCorto) {
      setError(`Tu texto es muy corto (escribe al menos ${minimoPalabras} palabras antes de entregar).`);
      return;
    }
    if (excedido) {
      setError(`Tu texto pasa el límite (recórtalo a ${contenido.limite_palabras} palabras o menos antes de entregar).`);
      return;
    }

    await guardar({
      respuesta: {
        texto,
        checklist_marcado: marcado,
        analisisTexto: {
          variedadLexica: analisis.variedadLexica,
          muletillas: analisis.muletillasDetectadas.length,
          conectores: analisis.conectoresUsados.length,
          ideasFuenteRetomadas: overlap?.retomadas.length,
          ideasFuenteTotal: overlap?.total,
        },
      },
      estado: "pendiente_revision",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {contenido.texto_fuente && (
        <div
          onCopy={bloquearCopiar}
          onContextMenu={(e) => e.preventDefault()}
          className="flex max-h-52 select-none flex-col gap-1.5 overflow-auto rounded-xl bg-slate-50 px-4 py-3.5 dark:bg-slate-800/60"
        >
          {contenido.titulo_fuente && (
            <p className="font-semibold text-slate-900 dark:text-slate-50">{contenido.titulo_fuente}</p>
          )}
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {contenido.texto_fuente}
          </p>
        </div>
      )}

      {contenido.ejemplos_resueltos && (
        <div className="flex flex-col gap-2">
          {!mostrarEjemplos ? (
            <button
              type="button"
              onClick={() => setMostrarEjemplos(true)}
              className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              <Lightbulb className="size-4" aria-hidden="true" />
              Ver ejemplos ya resueltos (resumen, síntesis y paráfrasis)
            </button>
          ) : (
            <div
              onCopy={bloquearCopiar}
              onContextMenu={(e) => e.preventDefault()}
              className="select-none whitespace-pre-line rounded-xl bg-indigo-50/60 px-4 py-3.5 text-sm leading-relaxed text-slate-700 dark:bg-indigo-950/30 dark:text-slate-300"
            >
              {contenido.ejemplos_resueltos}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Textarea
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            marcarSinGuardar();
          }}
          onPaste={bloquearPegado}
          rows={6}
          placeholder="Escribe aquí"
        />
        <p
          className={`self-end text-xs font-medium ${
            excedido || muyCorto ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {palabras} / {contenido.limite_palabras} palabras
          {muyCorto && ` (mínimo ${minimoPalabras})`}
        </p>
      </div>

      {palabras >= 15 && (
        <div className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3.5 text-xs dark:bg-slate-800/60">
          <p className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
            <Sparkles className="size-3.5 text-indigo-500" aria-hidden="true" />
            Lectura automática de tu texto
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 dark:text-slate-500">
            <span>
              Variedad léxica:{" "}
              <strong
                className={
                  analisis.variedadLexica >= 60
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                }
              >
                {analisis.variedadLexica}%
              </strong>
            </span>
            <span>Oraciones: {analisis.oraciones}</span>
            {analisis.oracionesLargas > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                {analisis.oracionesLargas} oración(es) muy larga(s)
              </span>
            )}
          </div>
          {analisis.muletillasDetectadas.length > 0 && (
            <p className="text-amber-600 dark:text-amber-400">
              Repites bastante:{" "}
              {analisis.muletillasDetectadas.map((m) => `"${m.palabra}" (${m.veces})`).join(", ")}
            </p>
          )}
          {analisis.conectoresUsados.length > 0 && (
            <p className="text-emerald-600 dark:text-emerald-400">
              Buen uso de conectores: {analisis.conectoresUsados.join(", ")}
            </p>
          )}
          {overlap && overlap.total > 0 && (
            <p
              className={
                overlap.retomadas.length >= overlap.total / 2
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }
            >
              Retomas {overlap.retomadas.length} de {overlap.total} ideas clave del texto fuente
              {overlap.retomadas.length > 0 && `: ${overlap.retomadas.join(", ")}`}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2.5 rounded-xl border border-slate-200 px-4 py-3.5 dark:border-slate-800">
        <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-slate-50">
          <ListChecks className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          Antes de entregar, revisa
        </p>
        {contenido.checklist.map((punto, i) => (
          <label key={i} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={marcado[i]}
              onChange={() => alternar(i)}
              className="size-4 rounded border-slate-300 accent-indigo-600 dark:border-slate-600"
            />
            {punto}
          </label>
        ))}
      </div>

      {error && <ErrorText>{error}</ErrorText>}
      {guardado && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Guardado. Puedes seguir puliendo tu texto cuando quieras.
        </p>
      )}
      <Boton type="submit" cargando={cargando}>
        {cargando ? "Guardando..." : "Guardar mi texto"}
      </Boton>
    </form>
  );
}
