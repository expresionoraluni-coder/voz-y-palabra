"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, Filter, MessageSquareText, RotateCcw, Search } from "lucide-react";
import { CATEGORIAS_REPORTE, ESTADOS_REPORTE, ETIQUETAS_CATEGORIA, PRIORIDADES_REPORTE } from "@/lib/reportes-constantes";
import EmptyState from "@/components/ui/empty-state";
import ReporteAtencion from "./reporte-atencion";

type Reporte = {
  id: string;
  reportante_tipo: "estudiante" | "docente";
  estudiante_id: string | null;
  docente_id: string | null;
  grupo_id: string | null;
  unidad_id: string | null;
  actividad_id: string | null;
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

const OPCIONES = {
  estado: [["", "Todos los estados"], ["recibido", "Recibido"], ["en_revision", "En revisión"], ["necesita_informacion", "Necesita información"], ["resuelto", "Resuelto"], ["cerrado", "Cerrado"]],
  prioridad: [["", "Todas las prioridades"], ["urgente", "Urgente"], ["alta", "Alta"], ["normal", "Normal"], ["baja", "Baja"]],
  tipo: [["", "Estudiantes y docentes"], ["estudiante", "Estudiantes"], ["docente", "Docentes"]],
} as const;

const CATEGORIA_OPCIONES = [["", "Todas las categorías"], ...CATEGORIAS_REPORTE.map(([valor, etiqueta]) => [valor, etiqueta])] as const;

const COLAS_RAPIDAS = [
  { id: "todos", etiqueta: "Todos", estado: "", prioridad: "", tipo: "", vencidos: false },
  { id: "nuevos", etiqueta: "Nuevos", estado: "recibido", prioridad: "", tipo: "", vencidos: false },
  { id: "bloqueados", etiqueta: "Estudiantes bloqueados", estado: "", prioridad: "alta", tipo: "estudiante", vencidos: false },
  { id: "mios", etiqueta: "En revisión", estado: "en_revision", prioridad: "", tipo: "", vencidos: false },
  { id: "esperando", etiqueta: "Esperando respuesta", estado: "necesita_informacion", prioridad: "", tipo: "", vencidos: false },
  { id: "vencidos", etiqueta: "Vencidos", estado: "", prioridad: "", tipo: "", vencidos: true },
  { id: "urgentes", etiqueta: "Urgentes", estado: "", prioridad: "urgente", tipo: "", vencidos: false },
] as const;

function construirUrl(pathname: string, filtros: { estado: string; prioridad: string; tipo: string; categoria: string; busqueda: string; vencidos: boolean; pagina?: number }) {
  const params = new URLSearchParams();
  if (filtros.estado) params.set("estado", filtros.estado);
  if (filtros.prioridad) params.set("prioridad", filtros.prioridad);
  if (filtros.tipo) params.set("tipo", filtros.tipo);
  if (filtros.categoria) params.set("categoria", filtros.categoria);
  if (filtros.busqueda.trim()) params.set("q", filtros.busqueda.trim());
  if (filtros.vencidos) params.set("vencidos", "1");
  if ((filtros.pagina ?? 1) > 1) params.set("pagina", String(filtros.pagina));
  return `${pathname}${params.size ? `?${params.toString()}` : ""}`;
}

function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export default function BandejaReportes({
  reportes,
  grupos,
  estudiantes,
  docentes,
  unidades,
  actividades,
  eventos,
  mensajes,
  administradorId,
  total,
  pagina,
  paginas,
  ahora,
  filtrosIniciales,
}: {
  reportes: Reporte[];
  grupos: Map<string, string>;
  estudiantes: Map<string, string>;
  docentes: Map<string, string>;
  unidades: Map<string, string>;
  actividades: Map<string, string>;
  eventos: Map<string, EventoReporte[]>;
  mensajes: Map<string, MensajeReporte[]>;
  administradorId: string;
  total: number;
  pagina: number;
  paginas: number;
  ahora: string;
  filtrosIniciales: { estado: string; prioridad: string; tipo: string; categoria: string; busqueda: string; vencidos: boolean };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [estado, setEstado] = useState(filtrosIniciales.estado);
  const [prioridad, setPrioridad] = useState(filtrosIniciales.prioridad);
  const [tipo, setTipo] = useState(filtrosIniciales.tipo);
  const [categoria, setCategoria] = useState(filtrosIniciales.categoria);
  const [busqueda, setBusqueda] = useState(filtrosIniciales.busqueda);
  const [vencidos, setVencidos] = useState(filtrosIniciales.vencidos);
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(reportes[0]?.id ?? null);
  const hayFiltros = Boolean(estado || prioridad || tipo || categoria || busqueda || vencidos);
  const seleccionado = reportes.find((reporte) => reporte.id === seleccionadoId) ?? reportes[0] ?? null;
  const colaActual = COLAS_RAPIDAS.find((cola) => cola.estado === estado && cola.prioridad === prioridad && cola.tipo === tipo && cola.vencidos === vencidos && !categoria && !busqueda) ?? null;

  function navegar(cambios: Partial<{ estado: string; prioridad: string; tipo: string; categoria: string; busqueda: string; vencidos: boolean }> = {}) {
    router.push(construirUrl(pathname, {
      estado: cambios.estado ?? estado,
      prioridad: cambios.prioridad ?? prioridad,
      tipo: cambios.tipo ?? tipo,
      categoria: cambios.categoria ?? categoria,
      busqueda: cambios.busqueda ?? busqueda,
      vencidos: cambios.vencidos ?? vencidos,
    }));
  }

  function limpiarFiltros() {
    setEstado("");
    setPrioridad("");
    setTipo("");
    setCategoria("");
    setBusqueda("");
    setVencidos(false);
    router.push(pathname);
  }

  function aplicarFiltros(evento: React.FormEvent) {
    evento.preventDefault();
    navegar();
  }

  function aplicarCola(cola: (typeof COLAS_RAPIDAS)[number]) {
    setEstado(cola.estado);
    setPrioridad(cola.prioridad);
    setTipo(cola.tipo);
    setCategoria("");
    setBusqueda("");
    setVencidos(cola.vencidos);
    router.push(construirUrl(pathname, { estado: cola.estado, prioridad: cola.prioridad, tipo: cola.tipo, categoria: "", busqueda: "", vencidos: cola.vencidos }));
  }

  function hrefPagina(numero: number) {
    return construirUrl(pathname, { estado, prioridad, tipo, categoria, busqueda, vencidos, pagina: numero });
  }

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-label="Colas de trabajo">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-50">Bandeja de trabajo</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Elige una cola y trabaja un caso a la vez.</p>
          </div>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{total} {total === 1 ? "caso" : "casos"}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {COLAS_RAPIDAS.map((cola) => (
            <button key={cola.id} type="button" onClick={() => aplicarCola(cola)} aria-pressed={colaActual?.id === cola.id} className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${colaActual?.id === cola.id ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"}`}>
              {cola.id === "urgentes" && <AlertTriangle className="mr-1 inline size-3.5" aria-hidden="true" />}
              {cola.id === "vencidos" && <AlertTriangle className="mr-1 inline size-3.5" aria-hidden="true" />}
              {cola.etiqueta}
            </button>
          ))}
        </div>
        <details className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-200"><Filter className="mr-1.5 inline size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />Buscar y filtrar</summary>
          <form onSubmit={aplicarFiltros} className="mt-4 grid gap-3 sm:grid-cols-4">
            <label className="relative sm:col-span-4">
              <span className="sr-only">Buscar por texto, persona o grupo</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar descripción, persona, grupo o pantalla" className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50" />
            </label>
            <select aria-label="Filtrar por estado" value={estado} onChange={(event) => setEstado(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">{OPCIONES.estado.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}</select>
            <select aria-label="Filtrar por prioridad" value={prioridad} onChange={(event) => setPrioridad(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">{OPCIONES.prioridad.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}</select>
            <select aria-label="Filtrar por tipo de reportante" value={tipo} onChange={(event) => setTipo(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">{OPCIONES.tipo.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}</select>
            <select aria-label="Filtrar por categoría" value={categoria} onChange={(event) => setCategoria(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">{CATEGORIA_OPCIONES.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}</select>
            <div className="flex items-center justify-end gap-3 sm:col-span-4">
              {hayFiltros && <button type="button" onClick={limpiarFiltros} className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"><RotateCcw className="size-3.5" aria-hidden="true" />Limpiar</button>}
              <button type="submit" className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Aplicar filtros</button>
            </div>
          </form>
        </details>
      </section>

      {reportes.length === 0 ? (
        <EmptyState icon={MessageSquareText} titulo={hayFiltros ? "No hay reportes con estos filtros" : "Aún no hay reportes"} descripcion={hayFiltros ? "Prueba otra combinación o limpia los filtros." : "Cuando un estudiante o docente solicite ayuda, el caso aparecerá aquí."} />
      ) : (
        <section className="grid items-start gap-4 lg:grid-cols-[minmax(17rem,0.7fr)_minmax(0,1.5fr)]" aria-label="Bandeja de reportes filtrada">
          <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <h2 className="font-semibold text-slate-900 dark:text-slate-50">Casos</h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">{reportes.length} en esta página</span>
            </div>
            <ul className="max-h-[65vh] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {reportes.map((reporte) => {
                const nombre = reporte.reportante_tipo === "estudiante" ? estudiantes.get(reporte.estudiante_id ?? "") ?? "Estudiante" : docentes.get(reporte.docente_id ?? "") ?? "Docente";
                const conversacion = mensajes.get(reporte.id) ?? [];
                const ultimoMensaje = conversacion[conversacion.length - 1];
                const respondio = ultimoMensaje?.autor_tipo === "reportante";
                const vencido = Boolean(reporte.fecha_limite && new Date(reporte.fecha_limite).getTime() < new Date(ahora).getTime() && !["resuelto", "cerrado"].includes(reporte.estado));
                const seleccionadoAhora = seleccionado?.id === reporte.id;
                return (
                  <li key={reporte.id}>
                    <button type="button" onClick={() => setSeleccionadoId(reporte.id)} aria-current={seleccionadoAhora ? "true" : undefined} className={`w-full px-4 py-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${seleccionadoAhora ? "bg-indigo-50 dark:bg-indigo-950/30" : "hover:bg-slate-50 dark:hover:bg-slate-800/70"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{reporte.descripcion}</span>
                          <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">{nombre} · {ETIQUETAS_CATEGORIA[reporte.categoria] ?? reporte.categoria}</span>
                        </span>
                        <span className="shrink-0 text-[11px] text-slate-400">{fechaCorta(reporte.created_at)}</span>
                      </div>
                      <span className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{ESTADOS_REPORTE[reporte.estado] ?? reporte.estado}</span>
                        {reporte.prioridad !== "normal" && <span className={`rounded-full px-2 py-0.5 ${reporte.prioridad === "urgente" ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"}`}>{PRIORIDADES_REPORTE[reporte.prioridad] ?? reporte.prioridad}</span>}
                        {vencido && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">Vencido</span>}
                        {respondio && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Respondió</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
          {seleccionado && (
            <div className="lg:sticky lg:top-6">
              <ReporteAtencion
                key={`${seleccionado.id}:${seleccionado.updated_at}`}
                reporte={seleccionado}
                nombreReportante={seleccionado.reportante_tipo === "estudiante" ? estudiantes.get(seleccionado.estudiante_id ?? "") ?? "Estudiante" : docentes.get(seleccionado.docente_id ?? "") ?? "Docente"}
                nombreGrupo={seleccionado.grupo_id ? grupos.get(seleccionado.grupo_id) ?? null : null}
                nombreUnidad={seleccionado.unidad_id ? unidades.get(seleccionado.unidad_id) ?? null : null}
                nombreActividad={seleccionado.actividad_id ? actividades.get(seleccionado.actividad_id) ?? null : null}
                eventos={eventos.get(seleccionado.id) ?? []}
                mensajes={mensajes.get(seleccionado.id) ?? []}
                administradorId={administradorId}
              />
            </div>
          )}
        </section>
      )}

      {paginas > 1 && (
        <nav aria-label="Paginación de reportes" className="flex items-center justify-between gap-3 text-sm">
          {pagina > 1 ? <Link href={hrefPagina(pagina - 1)} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">← Anteriores</Link> : <span />}
          <span className="text-slate-500 dark:text-slate-400">Página {pagina} de {paginas} · {total} casos</span>
          {pagina < paginas ? <Link href={hrefPagina(pagina + 1)} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">Siguientes →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
