import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, BookOpen, ChevronRight, CircleAlert, Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import CerrarSesion from "@/components/cerrar-sesion";
import Avatar from "@/components/ui/avatar";
import { CardLink } from "@/components/ui/card";
import Boton from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import MetricCard from "@/components/ui/metric-card";
import { revisarErrorConsulta } from "@/lib/revisar-error-consulta";

type EstudianteDashboard = {
  id: string;
  grupo_id: string;
  created_at: string;
  activo: boolean;
};

type EntregaDashboard = {
  estudiante_id: string;
  created_at: string;
  estudiantes: { grupo_id: string; activo: boolean } | { grupo_id: string; activo: boolean }[] | null;
};

export default async function DashboardDocente() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/ingreso/profesora");

  const [
    { data: docente, error: docenteError },
    { data: grupos, error: gruposError },
    { data: unidades, error: unidadesError },
    { data: estudiantes, error: estudiantesError },
    { data: entregas, error: entregasError },
  ] = await Promise.all([
    // El layout ya valida el perfil; `maybeSingle` evita un 406 fugaz en
    // sesiones antiguas o durante la creación del perfil y permite que el
    // redirect del layout sea la única salida para una docente sin perfil.
    supabase.from("docentes").select("nombre").eq("id", user.id).maybeSingle(),
    supabase
      .from("grupos")
      .select("id, nombre, codigo_acceso")
      .eq("docente_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("unidades").select("id, nombre, orden, reto_comunicativo, actividades(id)").order("orden"),
    supabase.from("estudiantes").select("id, grupo_id, created_at, activo").eq("activo", true),
    supabase
      .from("entregas")
      .select("estudiante_id, created_at"),
  ]);

  revisarErrorConsulta(docenteError, "No pudimos cargar tu perfil docente.");
  revisarErrorConsulta(gruposError, "No pudimos cargar tus grupos.");
  revisarErrorConsulta(unidadesError, "No pudimos cargar las unidades del curso.");
  revisarErrorConsulta(estudiantesError, "No pudimos cargar el resumen de estudiantes.");
  revisarErrorConsulta(entregasError, "No pudimos cargar el resumen de avance.");

  if (!docente) redirect("/ingreso/profesora/verificar");

  // El resumen reutiliza las entregas que ya se necesitan para los grupos,
  // evitando una consulta independiente por cada tarjeta.
  const estudiantesActivos = (estudiantes ?? []) as EstudianteDashboard[];
  const entregasResumen = (entregas ?? []) as EntregaDashboard[];
  const totalActividades =
    unidades?.reduce((total, unidad) => total + (Array.isArray(unidad.actividades) ? unidad.actividades.length : 0), 0) ?? 0;
  const entregasPorEstudiante = new Map<string, { total: number; ultima: number | null }>();
  for (const entrega of entregasResumen) {
    const actual = entregasPorEstudiante.get(entrega.estudiante_id) ?? { total: 0, ultima: null };
    const fecha = new Date(entrega.created_at).getTime();
    actual.total += 1;
    actual.ultima = actual.ultima === null ? fecha : Math.max(actual.ultima, fecha);
    entregasPorEstudiante.set(entrega.estudiante_id, actual);
  }

  // eslint-disable-next-line react-hooks/purity
  const hoy = Date.now();
  const metricasPorGrupo = new Map<string, { estudiantes: number; sinEmpezar: number; activosSemana: number; avanceTotal: number }>();
  for (const estudiante of estudiantesActivos) {
    const actual = metricasPorGrupo.get(estudiante.grupo_id) ?? {
      estudiantes: 0,
      sinEmpezar: 0,
      activosSemana: 0,
      avanceTotal: 0,
    };
    const entregasEstudiante = entregasPorEstudiante.get(estudiante.id);
    const avance = totalActividades > 0 ? Math.min(100, Math.round(((entregasEstudiante?.total ?? 0) / totalActividades) * 100)) : 0;
    const diasDesdeUltima = entregasEstudiante?.ultima === null || entregasEstudiante?.ultima === undefined
      ? null
      : Math.floor((hoy - entregasEstudiante.ultima) / (1000 * 60 * 60 * 24));
    actual.estudiantes += 1;
    actual.sinEmpezar += entregasEstudiante?.total ? 0 : 1;
    actual.activosSemana += diasDesdeUltima !== null && diasDesdeUltima <= 7 ? 1 : 0;
    actual.avanceTotal += avance;
    metricasPorGrupo.set(estudiante.grupo_id, actual);
  }

  const totalEstudiantes = estudiantesActivos.length;
  const estudiantesSinEmpezar = estudiantesActivos.filter((estudiante) => !(entregasPorEstudiante.get(estudiante.id)?.total ?? 0)).length;
  const estudiantesActivosSemana = estudiantesActivos.filter((estudiante) => {
    const ultima = entregasPorEstudiante.get(estudiante.id)?.ultima;
    return ultima !== undefined && ultima !== null && Math.floor((hoy - ultima) / (1000 * 60 * 60 * 24)) <= 7;
  }).length;
  const avanceGeneral = totalEstudiantes > 0
    ? Math.round(estudiantesActivos.reduce((total, estudiante) => {
        const entregasEstudiante = entregasPorEstudiante.get(estudiante.id)?.total ?? 0;
        return total + (totalActividades > 0 ? Math.min(100, (entregasEstudiante / totalActividades) * 100) : 0);
      }, 0) / totalEstudiantes)
    : 0;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar nombre={docente.nombre} />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Hola, {docente.nombre.split(" ")[0]}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Seguimiento del curso</p>
          </div>
        </div>
        <CerrarSesion />
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="resumen-curso">
        <div>
          <h2 id="resumen-curso" className="text-lg font-semibold text-slate-900 dark:text-slate-50">Resumen del curso</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Una vista rápida para decidir dónde conviene mirar primero.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard etiqueta="Estudiantes activos" valor={totalEstudiantes} icon={Users} tono="slate" />
          <MetricCard etiqueta="Activos esta semana" valor={estudiantesActivosSemana} icon={Activity} tono="emerald" />
          <MetricCard etiqueta="Sin comenzar" valor={estudiantesSinEmpezar} icon={CircleAlert} tono="amber" />
          <MetricCard etiqueta="Avance promedio" valor={`${avanceGeneral}%`} icon={BookOpen} tono="indigo" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Tus grupos</h2>
          <Link href="/docente/grupos/nuevo">
            <Boton size="sm">
              <Plus className="size-4" aria-hidden="true" />
              Crear grupo
            </Boton>
          </Link>
        </div>
        {!grupos || grupos.length === 0 ? (
          <EmptyState
            icon={Users}
            titulo="Todavía no tienes grupos"
            descripcion="Crea el primero para generar su código de acceso."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {grupos.map((g) => (
              <Link key={g.id} href={`/docente/grupos/${g.id}`}>
                <CardLink className="flex h-full flex-col gap-4 px-5 py-4">
                  {(() => {
                    const metrica = metricasPorGrupo.get(g.id) ?? { estudiantes: 0, sinEmpezar: 0, activosSemana: 0, avanceTotal: 0 };
                    const avance = metrica.estudiantes > 0 ? Math.round(metrica.avanceTotal / metrica.estudiantes) : 0;
                    return (
                      <>
                        <div className="flex items-start gap-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    <Users className="size-4" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-slate-50">{g.nombre}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-500">{metrica.estudiantes} estudiantes activos</p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                        </div>
                        <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-500">Avance</p>
                            <p className="mt-0.5 font-semibold text-slate-900 dark:text-slate-50">{avance}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-500">Activos 7 días</p>
                            <p className="mt-0.5 font-semibold text-slate-900 dark:text-slate-50">{metrica.activosSemana}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-500">Sin comenzar</p>
                            <p className="mt-0.5 font-semibold text-slate-900 dark:text-slate-50">{metrica.sinEmpezar}</p>
                          </div>
                        </div>
                        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Abrir seguimiento del grupo</p>
                      </>
                    );
                  })()}
                </CardLink>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Unidades del curso</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Consulta las actividades actuales y ajusta su contenido cuando sea necesario.</p>
        <div className="grid gap-3 md:grid-cols-3">
          {unidades?.map((u) => (
            <Link key={u.id} href={`/docente/unidades/${u.id}`}>
              <CardLink className="flex h-full items-center gap-4 px-4 py-3.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <BookOpen className="size-4" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-slate-50">
                    Unidad {u.orden}. {u.nombre}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-500">{Array.isArray(u.actividades) ? u.actividades.length : 0} actividades</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden="true" />
              </CardLink>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
