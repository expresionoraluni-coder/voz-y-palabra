"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Sparkles, XCircle } from "lucide-react";
import { useEntregaActividad } from "@/hooks/useEntregaActividad";
import { Select } from "@/components/ui/field";
import PieEntregaAuto from "@/components/estudiante/pie-entrega-auto";
import { useIntentosAuto } from "@/hooks/useIntentosAuto";
import { bloquearCopiar } from "@/lib/anti-copiar";
import { PUNTAJE_MINIMO_SIN_REINTENTO } from "@/lib/intentos-auto";
import type { ContenidoClasificacionPublico } from "@/lib/calificacion-clasificacion";
import { calificarClasificacionAccion } from "./acciones-calificacion";

function mezclar<T>(arr: T[]): T[] {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export default function Clasificacion({
  actividadId,
  contenido,
  respuestaPrevia,
  dosNiveles,
  puntajeAuto,
}: {
  actividadId: string;
  contenido: ContenidoClasificacionPublico;
  respuestaPrevia?: {
    elegidas: string[];
    resultado?: boolean[];
    _meta?: { intentos?: number; ejercicio?: 1 | 2 };
  };
  dosNiveles?: boolean;
  puntajeAuto?: number | null;
}) {
  const intentoInicial = respuestaPrevia?._meta?.intentos ?? 1;
  const ejercicioGuardado = respuestaPrevia?._meta?.ejercicio;
  const tieneReintentoAlternativo = Boolean(contenido.reintento_alternativo);
  const maxIntentos = tieneReintentoAlternativo ? 2 : 1;
  const [usandoReintentoAlternativo, setUsandoReintentoAlternativo] = useState(
    tieneReintentoAlternativo &&
      (ejercicioGuardado === 2 || (ejercicioGuardado === undefined && intentoInicial >= 2)),
  );
  const contenidoActivo = usandoReintentoAlternativo && contenido.reintento_alternativo
    ? contenido.reintento_alternativo
    : contenido;
  const { cargando, error, setError, guardarConAccion, prepararReintento, entregaRegistrada } = useEntregaActividad(Boolean(respuestaPrevia));
  const { intentos, mejorPuntaje, registrarEntrega } = useIntentosAuto(
    respuestaPrevia,
    puntajeAuto ?? null,
    Boolean(respuestaPrevia),
    maxIntentos,
  );
  const [elegidas, setElegidas] = useState<string[]>(
    respuestaPrevia?.elegidas ?? contenidoActivo.elementos.map(() => ""),
  );
  const [resultado, setResultado] = useState<boolean[] | null>(respuestaPrevia?.resultado ?? null);
  const bloqueado = entregaRegistrada || resultado !== null;
  const reintentoObligatorio =
    tieneReintentoAlternativo &&
    intentos < maxIntentos &&
    mejorPuntaje !== null &&
    mejorPuntaje < PUNTAJE_MINIMO_SIN_REINTENTO;

  // En las actividades de "dos niveles" (una vez aprobadas, desbloquean su
  // nivel 2) el orden se revuelve una sola vez por carga de página — así no
  // se puede memorizar "la pregunta 3 siempre es X" antes de entregar.
  const elementosOrden = useMemo(
    () => {
      const conIndice = contenidoActivo.elementos.map((el, i) => ({ ...el, indiceOriginal: i }));
      return dosNiveles ? mezclar(conIndice) : conIndice;
    },
    [contenidoActivo.elementos, dosNiveles],
  );
  const categoriasOrden = useMemo(
    () => (dosNiveles ? mezclar(contenidoActivo.categorias) : contenidoActivo.categorias),
    [contenidoActivo.categorias, dosNiveles],
  );

  function actualizar(indice: number, valor: string) {
    if (bloqueado) return;
    setElegidas((prev) => prev.map((v, i) => (i === indice ? valor : v)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (bloqueado) return;
    setError(null);

    if (elegidas.some((v) => !v)) {
      setError("Clasifica todos los elementos antes de guardar.");
      return;
    }

    const guardada = await guardarConAccion(() => calificarClasificacionAccion(actividadId, elegidas));
    if (guardada) {
      setResultado(guardada.resultado as boolean[]);
      registrarEntrega(guardada);
    }
  }

  function iniciarReintento() {
    if (!contenido.reintento_alternativo || intentos >= maxIntentos) return;
    prepararReintento();
    setError(null);
    setResultado(null);
    setUsandoReintentoAlternativo(true);
    setElegidas(contenido.reintento_alternativo.elementos.map(() => ""));
  }

  const elementosClasificados = elegidas.filter(Boolean).length;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-[1.35rem] border border-violet-200/80 bg-gradient-to-r from-violet-50 via-white to-indigo-50 px-4 py-3.5 dark:border-violet-900/70 dark:from-violet-950/35 dark:via-slate-900 dark:to-indigo-950/25">
        <div aria-hidden="true" className="absolute -right-6 -top-8 size-24 rounded-full bg-violet-200/55 blur-2xl dark:bg-violet-700/20" />
        <div className="relative flex items-center justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.13em] text-violet-700 dark:text-violet-300"><Sparkles className="size-3.5" aria-hidden="true" /> Estación de ideas</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">Relaciona cada idea con la categoría que mejor la explica.</p>
          </div>
          <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-violet-700 shadow-sm dark:bg-slate-900/75 dark:text-violet-200">{elementosClasificados}/{contenidoActivo.elementos.length}</span>
        </div>
      </div>
      {contenido.contexto && (
        <div
          onCopy={bloquearCopiar}
          onContextMenu={(e) => e.preventDefault()}
          className="select-none rounded-[1.2rem] border border-slate-200/80 bg-slate-50 px-4 py-3.5 text-sm leading-relaxed text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300"
        >
          {contenido.contexto}
        </div>
      )}
      {elementosOrden.map((el) => {
        const i = el.indiceOriginal;
        return (
          <div
            key={i}
            className="flex flex-col gap-2.5 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3.5 shadow-[0_8px_20px_-20px_rgb(15_23_42/0.5)] transition-[border-color,transform,box-shadow] focus-within:border-indigo-300 focus-within:shadow-[0_12px_24px_-20px_rgb(79_70_229/0.5)] dark:border-slate-800 dark:bg-slate-900 dark:focus-within:border-indigo-800"
          >
            <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{el.texto}</p>
            <Select value={elegidas[i]} disabled={bloqueado} onChange={(e) => actualizar(i, e.target.value)}>
              <option value="">Elige una categoría</option>
              {categoriasOrden.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            {resultado && (
              <p
                className={`flex items-center gap-1.5 text-sm ${
                  resultado[i]
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {resultado[i] ? (
                  <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                ) : (
                  <XCircle className="size-4 shrink-0" aria-hidden="true" />
                )}
                {resultado[i] ? "Correcto" : "Incorrecto; revisa tu elección"}
              </p>
            )}
          </div>
        );
      })}
      <PieEntregaAuto
        error={error}
        bloqueado={bloqueado}
        cargando={cargando}
        puntaje={mejorPuntaje}
        intentos={intentos}
        maxIntentos={maxIntentos}
        onReintentar={iniciarReintento}
        reintentoObligatorio={reintentoObligatorio}
      />
    </form>
  );
}
