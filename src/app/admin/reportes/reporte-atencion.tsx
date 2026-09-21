"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleCheck, ClipboardCheck, FileText, Lightbulb, MessageSquareText, RotateCcw } from "lucide-react";
import { ESTADOS_REPORTE, ETIQUETAS_CATEGORIA, PRIORIDADES_REPORTE, SUGERENCIAS_ATENCION } from "@/lib/reportes-constantes";
import { useBorradorLocal } from "@/hooks/use-borrador-local";
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
  actor_nombre: string;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  prioridad_nueva: string | null;
  resolucion_nueva: string | null;
  respuesta_publica_nueva: string | null;
  creado_en: string;
};

type MensajeReporte = {
  id: string;
  autor_tipo: "reportante" | "administrador";
  mensaje: string;
  creado_en: string;
};

type BorradorMensaje = { mensaje: string };

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

function fecha(iso: string) {
  return new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
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
  const [estado, setEstado] = useState(reporte.estado);
  const [prioridad, setPrioridad] = useState(reporte.prioridad);
  const [respuestaPublica, setRespuestaPublica] = useState(reporte.respuesta_publica ?? "");
  const [resolucion, setResolucion] = useState(reporte.resolucion ?? "");
  const [asignadoA, setAsignadoA] = useState(reporte.asignado_a);
  const [fechaLimite, setFechaLimite] = useState(reporte.fecha_limite ? reporte.fecha_limite.slice(0, 16) : "");
  const [actualizadoEn, setActualizadoEn] = useState(reporte.updated_at);
  const [cargando, setCargando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [detallesFinales, setDetallesFinales] = useState(Boolean(reporte.respuesta_publica || reporte.resolucion));
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);
  const [mensajeGuardado, setMensajeGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);
  const mensajeRef = useRef<HTMLTextAreaElement>(null);
  const { borrador, guardarBorrador, borrarBorrador } = useBorradorLocal<BorradorMensaje>({
    estudianteId: administradorId,
    tipo: "mensaje-reporte-admin",
    recursoId: reporte.id,
  });
  const [mensaje, setMensaje] = useState(() => borrador?.mensaje ?? "");
  const sugerencia = SUGERENCIAS_ATENCION[reporte.categoria];
  const contextoVisible = Object.entries(reporte.contexto ?? {})
    .filter(([clave]) => Object.hasOwn(ETIQUETAS_CONTEXTO, clave))
    .map(([clave, valor]) => ({ clave, valor: valorContexto(valor) }))
    .filter((item): item is { clave: string; valor: string } => item.valor !== null);

  useEffect(() => {
    if (mensaje.trim()) guardarBorrador({ mensaje });
    else borrarBorrador();
  }, [borrarBorrador, guardarBorrador, mensaje]);

  async function guardar(
    cambios: { estado?: string; prioridad?: string; asignadoA?: string | null; fechaLimite?: string } = {},
    refrescar = true,
  ): Promise<boolean> {
    if (cargando) return false;
    setError(null);
    setGuardado(false);
    setCargando(true);
    const datos = {
      estado: cambios.estado ?? estado,
      prioridad: cambios.prioridad ?? prioridad,
      asignadoA: cambios.asignadoA ?? asignadoA,
      fechaLimite: cambios.fechaLimite ?? fechaLimite,
    };
    const resultado = await guardarAtencionReporte({
      reporteId: reporte.id,
      estado: datos.estado,
      prioridad: datos.prioridad,
      respuestaPublica,
      resolucion,
      asignadoA: datos.asignadoA,
      fechaLimite: datos.fechaLimite ? new Date(datos.fechaLimite).toISOString() : null,
      actualizadoEn,
    });

    if (!resultado.ok) {
      setError(resultado.error ?? "No pudimos guardar la atención. Intenta de nuevo.");
      setCargando(false);
      return false;
    }

    setActualizadoEn(resultado.actualizadoEn);
    setEstado(datos.estado);
    setPrioridad(datos.prioridad);
    setAsignadoA(datos.asignadoA);
    setFechaLimite(datos.fechaLimite);
    setCargando(false);
    setGuardado(true);
    window.setTimeout(() => setGuardado(false), 1800);
    if (refrescar) window.setTimeout(() => router.refresh(), 250);
    return true;
  }

  async function tomarCaso() {
    await guardar({ estado: estado === "recibido" ? "en_revision" : estado, asignadoA: administradorId });
  }

  function prepararSolicitudInformacion() {
    setEstado("necesita_informacion");
    setAsignadoA(administradorId);
    setMensaje((actual) => actual.trim() || "Para continuar, necesitamos un poco más de información. ¿Puedes describir qué ocurrió, en qué pantalla y qué mensaje observaste?");
    setError(null);
    setErrorMensaje(null);
    window.requestAnimationFrame(() => {
      mensajeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      mensajeRef.current?.focus();
    });
  }

  async function marcarComoResuelto() {
    await guardar({ estado: "resuelto", asignadoA: administradorId });
  }

  async function cerrarCaso() {
    await guardar({ estado: "cerrado", asignadoA: administradorId });
  }

  async function enviarMensaje() {
    if (enviandoMensaje || cargando || !mensaje.trim() || estado === "cerrado") return;
    setErrorMensaje(null);
    setMensajeGuardado(false);
    setEnviandoMensaje(true);
    const guardadoSolicitud = await guardar({ asignadoA: administradorId }, false);
    if (!guardadoSolicitud) {
      setEnviandoMensaje(false);
      return;
    }
    const resultado = await enviarMensajeReporte(reporte.id, mensaje);
    if (!resultado.ok) {
      setErrorMensaje(resultado.error ?? "No pudimos enviar el mensaje.");
      setEnviandoMensaje(false);
      return;
    }
    borrarBorrador();
    setMensaje("");
    setEnviandoMensaje(false);
    setMensajeGuardado(true);
    router.refresh();
    window.setTimeout(() => setMensajeGuardado(false), 1800);
  }

  function atajoEnviar(evento: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((evento.ctrlKey || evento.metaKey) && evento.key === "Enter") {
      evento.preventDefault();
      void enviarMensaje();
    }
  }

  const responsable = asignadoA === administradorId ? "Asignado a ti" : asignadoA ? "Asignado a otro administrador" : "Sin asignar";

  return (
    <Card id={`reporte-${reporte.id}`} className="flex scroll-mt-6 flex-col gap-5 p-5 sm:p-6">
      <header className="border-b border-slate-100 pb-5 dark:border-slate-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">Caso seleccionado</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{reporte.descripcion}</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {nombreReportante} · {reporte.reportante_tipo === "estudiante" ? "estudiante" : "docente"} · {ETIQUETAS_CATEGORIA[reporte.categoria] ?? reporte.categoria}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className={`rounded-full px-2.5 py-1 ${ESTILOS_ESTADO[estado] ?? ESTILOS_ESTADO.cerrado}`}>{ESTADOS_REPORTE[estado] ?? estado}</span>
          <span className={`rounded-full px-2.5 py-1 ${ESTILOS_PRIORIDAD[prioridad] ?? ESTILOS_PRIORIDAD.normal}`}>{PRIORIDADES_REPORTE[prioridad] ?? prioridad}</span>
          <span className="font-normal text-slate-500 dark:text-slate-400">{reporte.antiguedad}</span>
        </div>
        <dl className="mt-4 grid gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
          <div><dt className="font-semibold text-slate-700 dark:text-slate-200">Responsable</dt><dd className="mt-0.5">{responsable}</dd></div>
          <div><dt className="font-semibold text-slate-700 dark:text-slate-200">Fecha límite</dt><dd className="mt-0.5">{fechaLimite ? fecha(new Date(fechaLimite).toISOString()) : "Sin fecha"}</dd></div>
          {nombreGrupo && <div><dt className="font-semibold text-slate-700 dark:text-slate-200">Grupo</dt><dd className="mt-0.5">{nombreGrupo}</dd></div>}
          {nombreUnidad && <div><dt className="font-semibold text-slate-700 dark:text-slate-200">Unidad</dt><dd className="mt-0.5">{nombreUnidad}</dd></div>}
          {nombreActividad && <div><dt className="font-semibold text-slate-700 dark:text-slate-200">Actividad</dt><dd className="mt-0.5">{nombreActividad}</dd></div>}
          {reporte.ruta && <div><dt className="font-semibold text-slate-700 dark:text-slate-200">Pantalla</dt><dd className="mt-0.5 break-all">{reporte.ruta}</dd></div>}
        </dl>
      </header>

      <section className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/70 dark:bg-indigo-950/30" aria-label="Acciones rápidas del caso">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-50">¿Qué necesitas hacer?</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">Las acciones habituales no requieren una nota. El caso siempre se puede reabrir.</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {asignadoA !== administradorId && <Boton type="button" size="sm" variant="secondary" onClick={() => void tomarCaso()} cargando={cargando}><ClipboardCheck className="size-4" aria-hidden="true" />Tomar caso</Boton>}
          {estado !== "cerrado" && <Boton type="button" size="sm" variant="secondary" onClick={prepararSolicitudInformacion} disabled={cargando}><MessageSquareText className="size-4" aria-hidden="true" />Pedir información</Boton>}
          {estado !== "resuelto" && estado !== "cerrado" && <Boton type="button" size="sm" variant="secondary" onClick={() => void marcarComoResuelto()} cargando={cargando}><CircleCheck className="size-4" aria-hidden="true" />Marcar resuelto</Boton>}
          {estado !== "cerrado" && <Boton type="button" size="sm" variant="ghost" onClick={() => void cerrarCaso()} cargando={cargando}>Cerrar caso</Boton>}
          {estado === "cerrado" && <Boton type="button" size="sm" variant="secondary" onClick={() => void guardar({ estado: "en_revision", asignadoA: administradorId })} cargando={cargando}><RotateCcw className="size-4" aria-hidden="true" />Reabrir caso</Boton>}
        </div>
      </section>

      <section aria-labelledby={`conversacion-${reporte.id}`}>
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h3 id={`conversacion-${reporte.id}`} className="font-semibold text-slate-900 dark:text-slate-50">Conversación</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Todo lo que envíes aquí es visible para quien creó el reporte.</p>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">{mensajes.length} {mensajes.length === 1 ? "mensaje" : "mensajes"}</span>
        </div>
        {mensajes.length > 0 ? (
          <ol className="mt-3 flex max-h-96 flex-col gap-3 overflow-y-auto rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            {mensajes.map((item) => (
              <li key={item.id} className={`rounded-lg p-3 text-sm leading-relaxed ${item.autor_tipo === "administrador" ? "bg-indigo-50 text-indigo-950 dark:bg-indigo-950/40 dark:text-indigo-100" : "bg-slate-50 text-slate-800 dark:bg-slate-800/70 dark:text-slate-200"}`}>
                <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                  <span>{item.autor_tipo === "administrador" ? "Administración" : nombreReportante}</span>
                  <time dateTime={item.creado_en} className="font-normal text-slate-500 dark:text-slate-400">{fecha(item.creado_en)}</time>
                </div>
                <p className="mt-1 whitespace-pre-wrap">{item.mensaje}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">Todavía no hay mensajes en este caso.</p>
        )}
        {estado === "cerrado" ? (
          <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">El caso está cerrado. Reábrelo si necesitas enviar un nuevo mensaje.</p>
        ) : (
          <div className="mt-4">
            <Field>
              <Label htmlFor={`mensaje-${reporte.id}`}>Escribir un mensaje</Label>
              <textarea ref={mensajeRef} id={`mensaje-${reporte.id}`} value={mensaje} onChange={(event) => setMensaje(event.target.value)} onKeyDown={atajoEnviar} maxLength={2000} rows={3} placeholder="Explica el siguiente paso o comparte información útil" className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50" />
              <HelpText>{mensaje.length}/2000 · Borrador guardado solo en este navegador · Ctrl/Cmd + Enter para enviar.</HelpText>
              {errorMensaje && <ErrorText>{errorMensaje}</ErrorText>}
              <div className="mt-2 flex justify-end">
                <Boton type="button" size="sm" variant="secondary" onClick={enviarMensaje} cargando={enviandoMensaje} disabled={!mensaje.trim() || cargando}>
                  <span aria-live="polite">{mensajeGuardado ? "Enviado" : "Enviar mensaje"}</span>
                </Boton>
              </div>
            </Field>
          </div>
        )}
      </section>

      <details open={detallesFinales} onToggle={(evento) => setDetallesFinales(evento.currentTarget.open)} className="rounded-xl border border-slate-200 dark:border-slate-700">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-200">Respuesta pública y nota interna</summary>
        <div className="flex flex-col gap-4 border-t border-slate-200 p-4 dark:border-slate-700">
          <Field>
            <Label htmlFor={`respuesta-publica-${reporte.id}`}>Respuesta pública (opcional)</Label>
            <textarea id={`respuesta-publica-${reporte.id}`} value={respuestaPublica} onChange={(event) => setRespuestaPublica(event.target.value)} maxLength={2000} rows={3} placeholder="Resumen que también aparecerá en Mis solicitudes" className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50" />
          </Field>
          <Field>
            <Label htmlFor={`resolucion-${reporte.id}`}>Nota interna (opcional)</Label>
            <textarea id={`resolucion-${reporte.id}`} value={resolucion} onChange={(event) => setResolucion(event.target.value)} maxLength={2000} rows={3} placeholder="Qué verificaste o cómo se resolvió" className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50" />
          </Field>
          {sugerencia && (
            <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5 text-sm dark:border-indigo-900/70 dark:bg-indigo-950/30">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <div className="min-w-0 text-slate-700 dark:text-slate-300">
                <p><span className="font-semibold text-slate-900 dark:text-slate-50">Sugerencia de revisión:</span> {sugerencia}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Es una guía de revisión, no una resolución automática.</p>
                <button type="button" onClick={() => setResolucion((actual) => actual.trim() ? actual : sugerencia)} className="mt-2 text-xs font-semibold text-indigo-600 underline underline-offset-2 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">Usar como base de la nota</button>
              </div>
            </div>
          )}
          {error && <ErrorText>{error}</ErrorText>}
          <div className="flex justify-end">
            <Boton type="button" size="sm" onClick={() => void guardar()} cargando={cargando}>
              {guardado ? <Check className="size-4" aria-hidden="true" /> : <FileText className="size-4" aria-hidden="true" />}
              <span aria-live="polite">{guardado ? "Guardado" : "Guardar estos detalles"}</span>
            </Boton>
          </div>
        </div>
      </details>

      <details className="rounded-xl border border-slate-200 dark:border-slate-700">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-200">Opciones y contexto técnico</summary>
        <div className="flex flex-col gap-4 border-t border-slate-200 p-4 dark:border-slate-700">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <Label htmlFor={`estado-${reporte.id}`}>Estado</Label>
              <select id={`estado-${reporte.id}`} value={estado} onChange={(event) => setEstado(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">
                {[estado, ...(TRANSICIONES[estado] ?? [])].filter((valor, indice, opciones) => opciones.indexOf(valor) === indice).map((valor) => <option key={valor} value={valor}>{ESTADOS_REPORTE[valor] ?? valor}</option>)}
              </select>
            </Field>
            <Field>
              <Label htmlFor={`prioridad-${reporte.id}`}>Prioridad</Label>
              <select id={`prioridad-${reporte.id}`} value={prioridad} onChange={(event) => setPrioridad(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">
                {Object.entries(PRIORIDADES_REPORTE).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
              </select>
            </Field>
          </div>
          <Field>
            <Label htmlFor={`fecha-limite-${reporte.id}`}>Fecha límite opcional</Label>
            <input id={`fecha-limite-${reporte.id}`} type="datetime-local" value={fechaLimite} onChange={(event) => setFechaLimite(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50" />
          </Field>
          {asignadoA && <Boton type="button" size="sm" variant="ghost" onClick={() => setAsignadoA(null)}>Quitar responsable</Boton>}
          <div className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
            <p><span className="font-semibold">Recibido:</span> {fecha(reporte.created_at)}</p>
            {contextoVisible.length > 0 && <div className="mt-3 border-t border-slate-200 pt-3 text-xs dark:border-slate-700"><p className="font-semibold">Contexto capturado</p>{contextoVisible.map(({ clave, valor }) => <p key={clave} className="mt-1"><span className="font-medium">{etiquetaContexto(clave)}:</span> {valor}</p>)}</div>}
          </div>
        </div>
      </details>

      {eventos.length > 0 && (
        <details className="rounded-xl border border-slate-200 dark:border-slate-700">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-200">Historial de atención ({eventos.length})</summary>
          <ol className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-700">
            {eventos.map((evento) => (
              <li key={evento.id} className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-slate-800 dark:text-slate-100">{evento.actor_nombre}</span><time dateTime={evento.creado_en} className="text-slate-400">{fecha(evento.creado_en)}</time></div>
                <p className="mt-1">{evento.estado_anterior ? (ESTADOS_REPORTE[evento.estado_anterior] ?? evento.estado_anterior) : "Sin estado"} → {evento.estado_nuevo ? (ESTADOS_REPORTE[evento.estado_nuevo] ?? evento.estado_nuevo) : "Sin estado"} · {evento.prioridad_nueva ? (PRIORIDADES_REPORTE[evento.prioridad_nueva] ?? evento.prioridad_nueva) : "Sin prioridad"}</p>
                {evento.respuesta_publica_nueva && <p className="mt-1 rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950/30">Respuesta pública: {evento.respuesta_publica_nueva}</p>}
                {evento.resolucion_nueva && <p className="mt-1 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/70">{evento.resolucion_nueva}</p>}
              </li>
            ))}
          </ol>
        </details>
      )}
    </Card>
  );
}
