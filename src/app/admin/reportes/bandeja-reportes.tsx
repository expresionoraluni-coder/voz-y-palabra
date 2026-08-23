"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Filter, MessageSquareText, RotateCcw, Search } from "lucide-react";
import { CATEGORIAS_REPORTE } from "@/lib/reportes-constantes";
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
  filtrosIniciales: { estado: string; prioridad: string; tipo: string; categoria: string; busqueda: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [estado, setEstado] = useState(filtrosIniciales.estado);
  const [prioridad, setPrioridad] = useState(filtrosIniciales.prioridad);
  const [tipo, setTipo] = useState(filtrosIniciales.tipo);
  const [categoria, setCategoria] = useState(filtrosIniciales.categoria);
  const [busqueda, setBusqueda] = useState(filtrosIniciales.busqueda);
  const hayFiltros = Boolean(estado || prioridad || tipo || categoria || busqueda);

  function limpiarFiltros() {
    setEstado("");
    setPrioridad("");
    setTipo("");
    setCategoria("");
    setBusqueda("");
    router.push(pathname);
  }

  function aplicarFiltros(evento: React.FormEvent) {
    evento.preventDefault();
    const params = new URLSearchParams();
    if (estado) params.set("estado", estado);
    if (prioridad) params.set("prioridad", prioridad);
    if (tipo) params.set("tipo", tipo);
    if (categoria) params.set("categoria", categoria);
    if (busqueda.trim()) params.set("q", busqueda.trim());
    router.push(`${pathname}${params.size ? `?${params.toString()}` : ""}`);
  }

  function hrefPagina(numero: number) {
    const params = new URLSearchParams();
    if (estado) params.set("estado", estado);
    if (prioridad) params.set("prioridad", prioridad);
    if (tipo) params.set("tipo", tipo);
    if (categoria) params.set("categoria", categoria);
    if (busqueda.trim()) params.set("q", busqueda.trim());
    if (numero > 1) params.set("pagina", String(numero));
    return `${pathname}${params.size ? `?${params.toString()}` : ""}`;
  }

  return (
    <>
      <form onSubmit={aplicarFiltros} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 sm:col-span-4">
          <Filter className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          Filtrar la atención
          <span className="font-normal text-slate-500 dark:text-slate-400">{reportes.length} en esta página · {total} en total</span>
          {hayFiltros && (
              <button type="button" onClick={limpiarFiltros} className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Limpiar
            </button>
          )}
        </div>
        <label className="relative sm:col-span-4">
          <span className="sr-only">Buscar por texto, persona o grupo</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar descripción, persona, grupo o pantalla" className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50" />
        </label>
        <select aria-label="Filtrar por estado" value={estado} onChange={(e) => setEstado(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">
          {OPCIONES.estado.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
        </select>
        <select aria-label="Filtrar por prioridad" value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">
          {OPCIONES.prioridad.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
        </select>
        <select aria-label="Filtrar por tipo de reportante" value={tipo} onChange={(e) => setTipo(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">
          {OPCIONES.tipo.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
        </select>
        <select aria-label="Filtrar por categoría" value={categoria} onChange={(e) => setCategoria(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">
          {CATEGORIA_OPCIONES.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
        </select>
        <button type="submit" className="h-10 rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:col-span-4 sm:justify-self-end">Aplicar filtros</button>
      </form>

      {reportes.length === 0 ? (
        <EmptyState icon={MessageSquareText} titulo={hayFiltros ? "No hay reportes con estos filtros" : "Aún no hay reportes"} descripcion={hayFiltros ? "Prueba con otra combinación o limpia los filtros." : "Cuando un estudiante o la docente solicite ayuda, el caso aparecerá aquí."} />
      ) : (
        <section className="flex flex-col gap-3" aria-label="Bandeja de reportes filtrada">
          {reportes.map((reporte) => (
            <ReporteAtencion
              key={reporte.id}
              reporte={reporte}
              nombreReportante={reporte.reportante_tipo === "estudiante" ? estudiantes.get(reporte.estudiante_id ?? "") ?? "Estudiante" : docentes.get(reporte.docente_id ?? "") ?? "Docente"}
              nombreGrupo={reporte.grupo_id ? grupos.get(reporte.grupo_id) ?? null : null}
              nombreUnidad={reporte.unidad_id ? unidades.get(reporte.unidad_id) ?? null : null}
              nombreActividad={reporte.actividad_id ? actividades.get(reporte.actividad_id) ?? null : null}
              eventos={eventos.get(reporte.id) ?? []}
              mensajes={mensajes.get(reporte.id) ?? []}
              administradorId={administradorId}
            />
          ))}
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
