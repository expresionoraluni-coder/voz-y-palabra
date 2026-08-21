"use client";

import { useState } from "react";
import { Check, ChevronDown, Lightbulb, MessageSquareText } from "lucide-react";
import { ESTADOS_REPORTE, ETIQUETAS_CATEGORIA, PRIORIDADES_REPORTE, SUGERENCIAS_ATENCION } from "@/lib/reportes-constantes";
import { Card } from "@/components/ui/card";
import Boton from "@/components/ui/button";
import { ErrorText, Field, HelpText, Input, Label } from "@/components/ui/field";
import { guardarAtencionReporte } from "./acciones-atencion";

const ESTILOS_ESTADO: Record<string, string> = {
  recibido: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  en_revision: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
  necesita_informacion: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
  resuelto: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  cerrado: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

const ESTILOS_PRIORIDAD: Record<string, string> = {
  urgente: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  alta: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  normal: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  baja: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

type Reporte = {
  id: string;
  reportante_tipo: "estudiante" | "docente";
  categoria: string;
  descripcion: string;
  estado: string;
  prioridad: string;
  ruta: string | null;
  contexto: Record<string, unknown>;
  resolucion: string | null;
  created_at: string;
  antiguedad: string;
};

export default function ReporteAtencion({
  reporte,
  nombreReportante,
  nombreGrupo,
}: {
  reporte: Reporte;
  nombreReportante: string;
  nombreGrupo: string | null;
}) {
  const [abierto, setAbierto] = useState(reporte.estado !== "cerrado");
  const [estado, setEstado] = useState(reporte.estado);
  const [prioridad, setPrioridad] = useState(reporte.prioridad);
  const [resolucion, setResolucion] = useState(reporte.resolucion ?? "");
  const [cargando, setCargando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sugerencia = SUGERENCIAS_ATENCION[reporte.categoria];

  async function guardar() {
    if (cargando) return;
    setError(null);
    setGuardado(false);
    setCargando(true);
    const resultado = await guardarAtencionReporte({ reporteId: reporte.id, estado, prioridad, resolucion });

    if (!resultado.ok) {
      setError(resultado.mensaje ?? "No pudimos guardar la atención. Intenta de nuevo.");
      setCargando(false);
      return;
    }

    setCargando(false);
    setGuardado(true);
    window.setTimeout(() => setGuardado(false), 1800);
  }

  return (
    <Card id={`reporte-${reporte.id}`} className="flex scroll-mt-6 flex-col gap-4 p-5">
      <button
        type="button"
        onClick={() => setAbierto((actual) => !actual)}
        className="flex items-start justify-between gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        aria-expanded={abierto}
      >
        <span className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <MessageSquareText className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-slate-900 dark:text-slate-50">{reporte.descripcion}</span>
            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
              {nombreReportante} · {reporte.reportante_tipo === "estudiante" ? "estudiante" : "docente"} · {ETIQUETAS_CATEGORIA[reporte.categoria] ?? reporte.categoria}
              {nombreGrupo ? ` · ${nombreGrupo}` : ""}
            </span>
            <span className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
              <span className={`rounded-full px-2 py-0.5 ${ESTILOS_ESTADO[reporte.estado] ?? ESTILOS_ESTADO.cerrado}`}>{ESTADOS_REPORTE[reporte.estado] ?? reporte.estado}</span>
              <span className={`rounded-full px-2 py-0.5 ${ESTILOS_PRIORIDAD[reporte.prioridad] ?? ESTILOS_PRIORIDAD.normal}`}>{PRIORIDADES_REPORTE[reporte.prioridad] ?? reporte.prioridad}</span>
              <span className="font-normal text-slate-400 dark:text-slate-500">{reporte.antiguedad}</span>
            </span>
          </span>
        </span>
        <ChevronDown className={`size-4 shrink-0 text-slate-400 transition-transform ${abierto ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {abierto && (
        <div className="flex flex-col gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <Label htmlFor={`estado-${reporte.id}`}>Estado</Label>
              <select id={`estado-${reporte.id}`} value={estado} onChange={(e) => setEstado(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">
                {Object.entries(ESTADOS_REPORTE).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
              </select>
            </Field>
            <Field>
              <Label htmlFor={`prioridad-${reporte.id}`}>Prioridad</Label>
              <select id={`prioridad-${reporte.id}`} value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">
                {Object.entries(PRIORIDADES_REPORTE).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
              </select>
            </Field>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
            <p><span className="font-semibold">Recibido:</span> {new Date(reporte.created_at).toLocaleString("es-MX")}</p>
            {reporte.ruta && <p className="mt-1"><span className="font-semibold">Pantalla:</span> {reporte.ruta}</p>}
          </div>
          <Field>
            <Label htmlFor={`resolucion-${reporte.id}`}>Nota de atención</Label>
            <Input id={`resolucion-${reporte.id}`} value={resolucion} onChange={(e) => setResolucion(e.target.value)} maxLength={2000} placeholder="Qué revisaste o qué debe hacer la persona" />
            <HelpText>No es una calificación. Sirve para recordar cómo se resolvió el caso.</HelpText>
          </Field>
          {sugerencia && (
            <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5 text-sm dark:border-indigo-900/70 dark:bg-indigo-950/30">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <div className="flex min-w-0 flex-1 flex-col gap-2 text-slate-700 dark:text-slate-300">
                <p><span className="font-semibold text-slate-900 dark:text-slate-50">Sugerencia de revisión:</span> {sugerencia}</p>
                <button
                  type="button"
                  onClick={() => setResolucion((actual) => actual.trim() ? actual : sugerencia)}
                  className="w-fit text-xs font-semibold text-indigo-600 underline underline-offset-2 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  Usar como base de la nota
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400">Es una guía, no una resolución automática. Ajusta el texto a lo que realmente verificaste.</p>
              </div>
            </div>
          )}
          {Object.keys(reporte.contexto ?? {}).length > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">El reporte incluye contexto automático de la pantalla donde ocurrió.</p>
          )}
          {error && <ErrorText>{error}</ErrorText>}
          <div className="flex justify-end">
            <Boton type="button" size="sm" onClick={guardar} cargando={cargando}>
              {guardado ? <Check className="size-4" aria-hidden="true" /> : null}
              {guardado ? "Guardado" : "Guardar atención"}
            </Boton>
          </div>
        </div>
      )}
    </Card>
  );
}
