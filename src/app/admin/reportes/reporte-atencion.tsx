"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Lightbulb, MessageSquareText } from "lucide-react";
import { ESTADOS_REPORTE, ETIQUETAS_CATEGORIA, PRIORIDADES_REPORTE, SUGERENCIAS_ATENCION } from "@/lib/reportes-constantes";
import { Card } from "@/components/ui/card";
import Boton from "@/components/ui/button";
import { ErrorText, Field, HelpText, Label } from "@/components/ui/field";
import { enviarMensajeReporte, guardarAtencionReporte } from "./acciones-atencion";

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
  respuesta_publica: string | null;
  resolucion: string | null;
  asignado_a: string | null;
  asignado_en: string | null;
  fecha_limite: string | null;
  created_at: string;
  updated_at: string;
  antiguedad: string;
};

type EventoReporte = {
  id: string;
  reporte_id: string;
  actor_nombre: string;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  prioridad_anterior: string | null;
  prioridad_nueva: string | null;
  resolucion_anterior: string | null;
  resolucion_nueva: string | null;
  respuesta_publica_anterior: string | null;
  respuesta_publica_nueva: string | null;
  asignado_anterior: string | null;
  asignado_nuevo: string | null;
  creado_en: string;
};

type MensajeReporte = {
  id: string;
  reporte_id: string;
  autor_id: string;
  autor_tipo: "reportante" | "administrador";
  mensaje: string;
  creado_en: string;
};

const ETIQUETAS_CONTEXTO: Record<string, string> = {
  origen: "Origen",
  idioma: "Idioma",
  grupo_id: "Grupo identificado",
  unidad_id: "Unidad identificada",
  actividad_id: "Actividad identificada",
};

const TRANSICIONES: Record<string, string[]> = {
  recibido: ["en_revision", "necesita_informacion", "resuelto", "cerrado"],
  en_revision: ["necesita_informacion", "resuelto", "cerrado"],
  necesita_informacion: ["en_revision", "resuelto", "cerrado"],
  resuelto: ["en_revision", "cerrado"],
  cerrado: ["en_revision"],
};

function valorContexto(valor: unknown) {
  if (typeof valor === "string" || typeof valor === "number" || typeof valor === "boolean") return String(valor);
  return null;
}

function etiquetaContexto(clave: string) {
  return ETIQUETAS_CONTEXTO[clave] ?? clave.replaceAll("_", " ");
}

export default function ReporteAtencion({
  reporte,
  nombreReportante,
  nombreGrupo,
  nombreUnidad,
  nombreActividad,
  eventos,
  mensajes,
  administradorId,
}: {
  reporte: Reporte;
  nombreReportante: string;
  nombreGrupo: string | null;
  nombreUnidad: string | null;
  nombreActividad: string | null;
  eventos: EventoReporte[];
  mensajes: MensajeReporte[];
  administradorId: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(reporte.estado !== "cerrado");
  const [estado, setEstado] = useState(reporte.estado);
  const [prioridad, setPrioridad] = useState(reporte.prioridad);
  const [respuestaPublica, setRespuestaPublica] = useState(reporte.respuesta_publica ?? "");
  const [resolucion, setResolucion] = useState(reporte.resolucion ?? "");
  const [asignadoA, setAsignadoA] = useState(reporte.asignado_a);
  const [fechaLimite, setFechaLimite] = useState(reporte.fecha_limite ? reporte.fecha_limite.slice(0, 16) : "");
  const [actualizadoEn, setActualizadoEn] = useState(reporte.updated_at);
  const [cargando, setCargando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);
  const [mensajeGuardado, setMensajeGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);
  const sugerencia = SUGERENCIAS_ATENCION[reporte.categoria];
  const contextoVisible = Object.entries(reporte.contexto ?? {})
    .filter(([clave]) => Object.hasOwn(ETIQUETAS_CONTEXTO, clave))
    .map(([clave, valor]) => ({ clave, valor: valorContexto(valor) }))
    .filter((item): item is { clave: string; valor: string } => item.valor !== null);

  async function guardar() {
    if (cargando) return;
    setError(null);
    setGuardado(false);
    setCargando(true);
    const resultado = await guardarAtencionReporte({
      reporteId: reporte.id,
      estado,
      prioridad,
      respuestaPublica,
      resolucion,
      asignadoA,
      fechaLimite: fechaLimite ? new Date(fechaLimite).toISOString() : null,
      actualizadoEn,
    });

    if (!resultado.ok) {
      setError(resultado.error ?? "No pudimos guardar la atención. Intenta de nuevo.");
      setCargando(false);
      return;
    }

    setActualizadoEn(resultado.actualizadoEn);
    setCargando(false);
    setGuardado(true);
    window.setTimeout(() => setGuardado(false), 1800);
  }

  async function enviarMensaje() {
    if (enviandoMensaje || !mensaje.trim()) return;
    setErrorMensaje(null);
    setMensajeGuardado(false);
    setEnviandoMensaje(true);
    const resultado = await enviarMensajeReporte(reporte.id, mensaje);
    if (!resultado.ok) {
      setErrorMensaje(resultado.error ?? "No pudimos enviar el mensaje.");
      setEnviandoMensaje(false);
      return;
    }
    setMensaje("");
    setEnviandoMensaje(false);
    setMensajeGuardado(true);
    router.refresh();
    window.setTimeout(() => setMensajeGuardado(false), 1800);
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
            <span className="mt-2 block text-[11px] text-slate-500 dark:text-slate-400">
              {asignadoA === administradorId ? "Asignado a ti" : asignadoA ? "Asignado a otro administrador" : "Sin asignar"}
              {fechaLimite ? ` · vence ${new Date(fechaLimite).toLocaleString("es-MX")}` : ""}
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
                {[reporte.estado, ...(TRANSICIONES[reporte.estado] ?? [])].filter((valor, indice, opciones) => opciones.indexOf(valor) === indice).map((valor) => <option key={valor} value={valor}>{ESTADOS_REPORTE[valor] ?? valor}</option>)}
              </select>
            </Field>
            <Field>
              <Label htmlFor={`prioridad-${reporte.id}`}>Prioridad</Label>
              <select id={`prioridad-${reporte.id}`} value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">
                {Object.entries(PRIORIDADES_REPORTE).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-sm dark:border-indigo-900/70 dark:bg-indigo-950/30">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900 dark:text-slate-50">Seguimiento operativo</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{asignadoA === administradorId ? "Este caso está asignado a ti." : asignadoA ? "Este caso está asignado a otro administrador." : "El caso todavía no tiene responsable."}</p>
            </div>
            {asignadoA !== administradorId && <Boton type="button" size="sm" variant="secondary" onClick={() => setAsignadoA(administradorId)}>Tomar caso</Boton>}
            {asignadoA && <Boton type="button" size="sm" variant="ghost" onClick={() => setAsignadoA(null)}>Quitar responsable</Boton>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <Label htmlFor={`fecha-limite-${reporte.id}`}>Fecha límite</Label>
              <input id={`fecha-limite-${reporte.id}`} type="datetime-local" value={fechaLimite} onChange={(e) => setFechaLimite(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50" />
            </Field>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
            <p><span className="font-semibold">Recibido:</span> {new Date(reporte.created_at).toLocaleString("es-MX")}</p>
            {reporte.ruta && <p className="mt-1 break-words"><span className="font-semibold">Pantalla:</span> {reporte.ruta}</p>}
            {nombreUnidad && <p className="mt-1"><span className="font-semibold">Unidad:</span> {nombreUnidad}</p>}
            {nombreActividad && <p className="mt-1"><span className="font-semibold">Actividad:</span> {nombreActividad}</p>}
            {contextoVisible.length > 0 && (
              <div className="mt-3 border-t border-slate-200 pt-3 text-xs dark:border-slate-700">
                <p className="font-semibold">Contexto capturado</p>
                {contextoVisible.map(({ clave, valor }) => <p key={clave} className="mt-1"><span className="font-medium">{etiquetaContexto(clave)}:</span> {valor}</p>)}
              </div>
            )}
          </div>
          {eventos.length > 0 && (
            <details className="rounded-xl border border-slate-200 dark:border-slate-700">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-200">Historial de atención ({eventos.length})</summary>
              <ol className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-700">
                {eventos.map((evento) => (
                  <li key={evento.id} className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{evento.actor_nombre}</span>
                      <time dateTime={evento.creado_en} className="text-slate-400 dark:text-slate-500">{new Date(evento.creado_en).toLocaleString("es-MX")}</time>
                    </div>
                    <p className="mt-1">{evento.estado_anterior ? (ESTADOS_REPORTE[evento.estado_anterior] ?? evento.estado_anterior) : "Sin estado"} → {evento.estado_nuevo ? (ESTADOS_REPORTE[evento.estado_nuevo] ?? evento.estado_nuevo) : "Sin estado"} · {evento.prioridad_nueva ? (PRIORIDADES_REPORTE[evento.prioridad_nueva] ?? evento.prioridad_nueva) : "Sin prioridad"}</p>
                    {evento.respuesta_publica_nueva && <p className="mt-1 rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950/30">Respuesta pública: {evento.respuesta_publica_nueva}</p>}
                    {evento.resolucion_nueva && <p className="mt-1 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/70">{evento.resolucion_nueva}</p>}
                  </li>
                ))}
              </ol>
            </details>
          )}
          {mensajes.length > 0 && (
            <details open className="rounded-xl border border-slate-200 dark:border-slate-700">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-200">Conversación ({mensajes.length})</summary>
              <ol className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-700">
                {mensajes.map((item) => (
                  <li key={item.id} className={`rounded-lg p-3 text-xs leading-relaxed ${item.autor_tipo === "administrador" ? "bg-indigo-50 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200" : "bg-slate-50 text-slate-700 dark:bg-slate-800/70 dark:text-slate-300"}`}>
                    <div className="flex items-center justify-between gap-2 font-semibold">
                      <span>{item.autor_tipo === "administrador" ? "Administración" : "Reportante"}</span>
                      <time dateTime={item.creado_en}>{new Date(item.creado_en).toLocaleString("es-MX")}</time>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap">{item.mensaje}</p>
                  </li>
                ))}
              </ol>
            </details>
          )}
          <Field>
            <Label htmlFor={`mensaje-${reporte.id}`}>Mensaje para el reportante</Label>
            <textarea id={`mensaje-${reporte.id}`} value={mensaje} onChange={(e) => setMensaje(e.target.value)} maxLength={2000} rows={2} placeholder="Solicita información o explica el siguiente paso" className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50" />
            <HelpText>{mensaje.length}/2000 · Este texto será visible para quien creó el reporte.</HelpText>
            {errorMensaje && <ErrorText>{errorMensaje}</ErrorText>}
            <div className="flex justify-end">
              <Boton type="button" size="sm" variant="secondary" onClick={enviarMensaje} cargando={enviandoMensaje} disabled={!mensaje.trim()}>
                <span aria-live="polite">{mensajeGuardado ? "Enviado" : "Enviar mensaje"}</span>
              </Boton>
            </div>
          </Field>
          <Field>
            <Label htmlFor={`respuesta-publica-${reporte.id}`}>Respuesta pública</Label>
            <textarea id={`respuesta-publica-${reporte.id}`} value={respuestaPublica} onChange={(e) => setRespuestaPublica(e.target.value)} maxLength={2000} rows={3} placeholder="Qué debe leer la persona para continuar" className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50" />
            <HelpText>{respuestaPublica.length}/2000 · Se mostrará en “Mis solicitudes”.</HelpText>
          </Field>
          <Field>
            <Label htmlFor={`resolucion-${reporte.id}`}>Nota interna</Label>
            <textarea id={`resolucion-${reporte.id}`} value={resolucion} onChange={(e) => setResolucion(e.target.value)} maxLength={2000} rows={3} placeholder="Qué revisaste, qué descartaste y cómo se resolvió" className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50" />
            <HelpText>{resolucion.length}/2000 · No es una calificación. Sirve para recordar cómo se resolvió el caso.</HelpText>
          </Field>
          {sugerencia && (
            <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5 text-sm dark:border-indigo-900/70 dark:bg-indigo-950/30">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <div className="flex min-w-0 flex-1 flex-col gap-2 text-slate-700 dark:text-slate-300">
                <p><span className="font-semibold text-slate-900 dark:text-slate-50">Sugerencia de revisión:</span> {sugerencia}</p>
                <button type="button" onClick={() => setResolucion((actual) => actual.trim() ? actual : sugerencia)} className="w-fit text-xs font-semibold text-indigo-600 underline underline-offset-2 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">Usar como base de la nota</button>
                <p className="text-xs text-slate-500 dark:text-slate-400">Es una guía, no una resolución automática. Ajusta el texto a lo que realmente verificaste.</p>
              </div>
            </div>
          )}
          {error && <ErrorText>{error}</ErrorText>}
          <div className="flex justify-end">
            <Boton type="button" size="sm" onClick={guardar} cargando={cargando}>
              {guardado ? <Check className="size-4" aria-hidden="true" /> : null}
              <span aria-live="polite">{guardado ? "Guardado" : "Guardar atención"}</span>
            </Boton>
          </div>
        </div>
      )}
    </Card>
  );
}
