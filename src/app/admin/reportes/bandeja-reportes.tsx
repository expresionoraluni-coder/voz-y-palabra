"use client";

import { useMemo, useState } from "react";
import { Filter, MessageSquareText } from "lucide-react";
import { CATEGORIAS_REPORTE } from "@/lib/reportes-constantes";
import EmptyState from "@/components/ui/empty-state";
import ReporteAtencion from "./reporte-atencion";

type Reporte = {
  id: string;
  reportante_tipo: "estudiante" | "docente";
  estudiante_id: string | null;
  docente_id: string | null;
  grupo_id: string | null;
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
}: {
  reportes: Reporte[];
  grupos: Map<string, string>;
  estudiantes: Map<string, string>;
  docentes: Map<string, string>;
}) {
  const [estado, setEstado] = useState("");
  const [prioridad, setPrioridad] = useState("");
  const [tipo, setTipo] = useState("");
  const [categoria, setCategoria] = useState("");
  const filtrados = useMemo(
    () => reportes.filter((reporte) =>
      (!estado || reporte.estado === estado) &&
      (!prioridad || reporte.prioridad === prioridad) &&
      (!tipo || reporte.reportante_tipo === tipo) &&
      (!categoria || reporte.categoria === categoria),
    ),
    [estado, prioridad, tipo, categoria, reportes],
  );

  return (
    <>
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 sm:col-span-4">
          <Filter className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          Filtrar la atención
          <span className="font-normal text-slate-500 dark:text-slate-400">{filtrados.length} de {reportes.length}</span>
        </div>
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
      </div>

      {filtrados.length === 0 ? (
        <EmptyState icon={MessageSquareText} titulo="No hay reportes con estos filtros" descripcion="Prueba con otra combinación o limpia los filtros." />
      ) : (
        <section className="flex flex-col gap-3" aria-label="Bandeja de reportes filtrada">
          {filtrados.map((reporte) => (
            <ReporteAtencion
              key={reporte.id}
              reporte={reporte}
              nombreReportante={reporte.reportante_tipo === "estudiante"
                ? estudiantes.get(reporte.estudiante_id ?? "") ?? "Estudiante"
                : docentes.get(reporte.docente_id ?? "") ?? "Docente"}
              nombreGrupo={reporte.grupo_id ? grupos.get(reporte.grupo_id) ?? null : null}
            />
          ))}
        </section>
      )}
    </>
  );
}
