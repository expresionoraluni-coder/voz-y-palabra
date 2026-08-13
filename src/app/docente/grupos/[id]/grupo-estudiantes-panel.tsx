"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckSquare, Search, UserCheck, UserMinus, Users, X } from "lucide-react";
import { actualizarEstudiantesLote } from "./acciones-estudiantes";
import AgregarEstudiantes from "./agregar-estudiantes";
import ExportarGrupo from "./exportar-grupo";
import Avatar from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import EmptyState from "@/components/ui/empty-state";
import ProgressBar from "@/components/ui/progress-bar";
import Boton from "@/components/ui/button";
import { Input, Select, ErrorText, HelpText } from "@/components/ui/field";

export type EstudianteResumen = {
  id: string;
  nombre: string;
  created_at: string;
  avance: number;
  ultima: number | null;
  diasInactivo: number | null;
  totalEntregas: number;
};

type EstudianteBaja = { id: string; nombre: string };
type FiltroEstudiantes = "todos" | "sin_empezar" | "en_ruta" | "completados" | "inactivos";

export default function GrupoEstudiantesPanel({
  grupoId,
  nombreGrupo,
  estudiantes,
  estudiantesBaja,
  nombresExistentes,
}: {
  grupoId: string;
  nombreGrupo: string;
  estudiantes: EstudianteResumen[];
  estudiantesBaja: EstudianteBaja[];
  nombresExistentes: string[];
}) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroEstudiantes>("todos");
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibles = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase("es-MX");
    return estudiantes.filter((estudiante) => {
      const coincideBusqueda = !termino || estudiante.nombre.toLocaleLowerCase("es-MX").includes(termino);
      const coincideFiltro =
        filtro === "todos" ||
        (filtro === "sin_empezar" && estudiante.totalEntregas === 0) ||
        (filtro === "en_ruta" && estudiante.totalEntregas > 0 && estudiante.avance < 100) ||
        (filtro === "completados" && estudiante.avance >= 100) ||
        (filtro === "inactivos" && estudiante.diasInactivo !== null && estudiante.diasInactivo > 10);
      return coincideBusqueda && coincideFiltro;
    });
  }, [busqueda, estudiantes, filtro]);

  const visiblesIds = visibles.map((estudiante) => estudiante.id);
  const todasVisiblesSeleccionadas = visiblesIds.length > 0 && visiblesIds.every((id) => seleccionados.includes(id));

  function alternarSeleccion(id: string) {
    setSeleccionados((actuales) => (actuales.includes(id) ? actuales.filter((actual) => actual !== id) : [...actuales, id]));
    setError(null);
  }

  function alternarTodas() {
    setSeleccionados((actuales) => {
      if (todasVisiblesSeleccionadas) return actuales.filter((id) => !visiblesIds.includes(id));
      return [...new Set([...actuales, ...visiblesIds])];
    });
    setError(null);
  }

  async function ejecutarAccion(accion: "dar_de_baja" | "reactivar") {
    const etiqueta = accion === "dar_de_baja" ? "dar de baja" : "reactivar";
    if (!window.confirm(`¿Quieres ${etiqueta} a ${seleccionados.length} estudiante(s)?`)) return;
    setCargando(true);
    setError(null);
    const resultado = await actualizarEstudiantesLote(grupoId, seleccionados, accion);
    if (!resultado.ok) {
      setError(resultado.error);
      setCargando(false);
      return;
    }
    setSeleccionados([]);
    setCargando(false);
    router.refresh();
  }

  return (
    <>
      <AgregarEstudiantes grupoId={grupoId} nombresExistentes={nombresExistentes} />

      <section className="flex flex-col gap-3" aria-labelledby="estudiantes-activos">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="estudiantes-activos" className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Estudiantes ({estudiantes.length})
            </h2>
            <HelpText>Busca, filtra y selecciona varias filas para actualizar su estado de una sola vez.</HelpText>
          </div>
          {estudiantes.length > 0 && <ExportarGrupo nombreGrupo={nombreGrupo} estudiantes={estudiantes} />}
        </div>

        {estudiantes.length === 0 ? (
          <EmptyState icon={Users} titulo="Todavía no hay estudiantes en este grupo" />
        ) : (
          <Card className="flex flex-col gap-3 p-4 sm:p-5">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem_auto]">
              <label className="relative block">
                <span className="sr-only">Buscar estudiante</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre"
                  className="pl-9"
                />
              </label>
              <label>
                <span className="sr-only">Filtrar estudiantes</span>
                <Select value={filtro} onChange={(e) => setFiltro(e.target.value as FiltroEstudiantes)}>
                  <option value="todos">Todos</option>
                  <option value="sin_empezar">Sin empezar</option>
                  <option value="en_ruta">En ruta</option>
                  <option value="completados">Completados</option>
                  <option value="inactivos">Sin actividad reciente</option>
                </Select>
              </label>
              <Boton type="button" variant="ghost" size="sm" onClick={alternarTodas} disabled={visibles.length === 0}>
                <CheckSquare className="size-4" aria-hidden="true" />
                {todasVisiblesSeleccionadas ? "Quitar selección" : "Seleccionar visibles"}
              </Boton>
            </div>

            {seleccionados.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 dark:border-indigo-900 dark:bg-indigo-950/30">
                <span className="mr-auto text-sm font-medium text-indigo-900 dark:text-indigo-100">
                  {seleccionados.length} seleccionado(s)
                </span>
                <Boton type="button" variant="secondary" size="sm" onClick={() => ejecutarAccion("dar_de_baja")} cargando={cargando}>
                  <UserMinus className="size-4" aria-hidden="true" />
                  Dar de baja
                </Boton>
                <Boton type="button" variant="ghost" size="sm" onClick={() => setSeleccionados([])} disabled={cargando}>
                  <X className="size-4" aria-hidden="true" />
                  Limpiar
                </Boton>
              </div>
            )}

            {error && <ErrorText>{error}</ErrorText>}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mostrando {visibles.length} de {estudiantes.length}. Las acciones solo afectan a estudiantes de este grupo.
            </p>

            {visibles.length === 0 ? (
              <EmptyState icon={Search} titulo="No encontramos coincidencias" descripcion="Prueba con otro nombre o cambia el filtro." />
            ) : (
              <div className="flex flex-col gap-2">
                {visibles.map((estudiante) => (
                  <div key={estudiante.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-800">
                    <input
                      type="checkbox"
                      checked={seleccionados.includes(estudiante.id)}
                      onChange={() => alternarSeleccion(estudiante.id)}
                      aria-label={`Seleccionar a ${estudiante.nombre}`}
                      className="size-4 shrink-0 accent-indigo-600"
                    />
                    <Avatar nombre={estudiante.nombre} size="sm" />
                    <Link href={`/docente/estudiantes/${estudiante.id}`} className="min-w-0 flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                      <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-50">{estudiante.nombre}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {estudiante.totalEntregas} entregas{estudiante.diasInactivo !== null ? ` · ${estudiante.diasInactivo} días sin actividad` : ""}
                      </span>
                    </Link>
                    <div className="hidden w-32 items-center gap-2 sm:flex">
                      <ProgressBar porcentaje={estudiante.avance} etiqueta={`Avance de ${estudiante.nombre}: ${estudiante.avance}%`} />
                      <span className="w-9 shrink-0 text-right text-xs text-slate-500 dark:text-slate-400">{estudiante.avance}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </section>

      {estudiantesBaja.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="estudiantes-baja">
          <h2 id="estudiantes-baja" className="text-sm font-medium text-slate-500 dark:text-slate-500">
            Dados de baja ({estudiantesBaja.length})
          </h2>
          <Card className="flex flex-col gap-2 p-3">
            {estudiantesBaja.map((estudiante) => (
              <div key={estudiante.id} className="flex items-center gap-3 rounded-lg px-2 py-2 opacity-70">
                <Avatar nombre={estudiante.nombre} size="sm" />
                <span className="flex-1 truncate text-sm text-slate-700 dark:text-slate-300">{estudiante.nombre}</span>
                <Boton type="button" variant="ghost" size="sm" onClick={async () => {
                  setSeleccionados([estudiante.id]);
                  const resultado = await actualizarEstudiantesLote(grupoId, [estudiante.id], "reactivar");
                  if (!resultado.ok) setError(resultado.error);
                  else router.refresh();
                }}>
                  <UserCheck className="size-4" aria-hidden="true" />
                  Reactivar
                </Boton>
              </div>
            ))}
          </Card>
        </section>
      )}
    </>
  );
}
