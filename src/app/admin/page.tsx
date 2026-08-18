import Link from "next/link";
import { Activity, CheckCircle2, MessageSquareText, ShieldCheck, Users } from "lucide-react";
import { requerirAdministrador } from "@/lib/supabase/requerir-administrador";
import { Card, CardLink } from "@/components/ui/card";
import MetricCard from "@/components/ui/metric-card";
import EmptyState from "@/components/ui/empty-state";
import { revisarErrorConsulta } from "@/lib/revisar-error-consulta";
import { ETIQUETAS_CATEGORIA, ESTADOS_REPORTE } from "@/lib/reportes-constantes";

const ESTADOS_PENDIENTES = ["recibido", "en_revision", "necesita_informacion"];

export default async function AdminDashboard() {
  const { supabase, administrador } = await requerirAdministrador();

  const [
    { data: reportes, error: reportesError },
    { count: reportesPendientesCount, error: pendientesError },
    { data: grupos, error: gruposError },
    { data: estudiantes, error: estudiantesError },
  ] = await Promise.all([
    supabase
      .from("reportes")
      .select("id, reportante_tipo, categoria, descripcion, estado, prioridad, grupo_id, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("reportes")
      .select("id", { count: "exact", head: true })
      .in("estado", ESTADOS_PENDIENTES),
    supabase.from("grupos").select("id, nombre, ciclo_escolar").order("nombre"),
    supabase.from("estudiantes").select("id, activo"),
  ]);

  revisarErrorConsulta(reportesError, "No pudimos cargar los reportes de atención.");
  revisarErrorConsulta(pendientesError, "No pudimos contar los reportes pendientes.");
  revisarErrorConsulta(gruposError, "No pudimos cargar los grupos para el monitoreo.");
  revisarErrorConsulta(estudiantesError, "No pudimos cargar el resumen de estudiantes.");

  const estudiantesActivos = (estudiantes ?? []).filter((estudiante) => estudiante.activo).length;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Panel administrativo</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Centro de atención de la plataforma</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Aquí se atienden los problemas que estudiantes o docentes no pueden resolver desde sus propios paneles.
          También puedes observar el estado general sin entrar como docente.
        </p>
      </section>

      <section aria-label="Resumen de la plataforma" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard etiqueta="Reportes pendientes" valor={reportesPendientesCount ?? 0} icon={MessageSquareText} tono="amber" />
        <MetricCard etiqueta="Grupos" valor={grupos?.length ?? 0} icon={Users} tono="indigo" />
        <MetricCard etiqueta="Estudiantes activos" valor={estudiantesActivos} icon={Activity} tono="emerald" />
        <MetricCard etiqueta="Acceso admin" valor="Protegido" icon={ShieldCheck} tono="slate" />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link href="/admin/reportes">
          <CardLink className="flex h-full flex-col gap-2 p-5">
            <MessageSquareText className="size-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <h2 className="font-semibold text-slate-900 dark:text-slate-50">Atender reportes</h2>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Revisa problemas de acceso, actividades, videos, avance o carga y registra cómo fueron resueltos.
            </p>
            <span className="mt-auto pt-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">Abrir bandeja</span>
          </CardLink>
        </Link>
        <Card className="flex flex-col gap-2 p-5">
          <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <h2 className="font-semibold text-slate-900 dark:text-slate-50">Monitoreo y automatizaciones</h2>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Cada reporte conserva el contexto de la pantalla, recibe una prioridad inicial y evita duplicados del mismo caso durante 24 horas. El acceso a este panel requiere autenticación en dos pasos.
          </p>
          <p className="mt-auto pt-2 text-xs text-slate-500 dark:text-slate-400">Administrador: {administrador.nombre}</p>
        </Card>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="reportes-recientes">
        <div>
          <h2 id="reportes-recientes" className="text-lg font-semibold text-slate-900 dark:text-slate-50">Reportes recientes</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Los casos nuevos aparecen primero.</p>
        </div>
        {!reportes || reportes.length === 0 ? (
          <EmptyState icon={MessageSquareText} titulo="Aún no hay reportes" descripcion="Cuando un estudiante o la docente pida ayuda, aparecerá aquí." />
        ) : (
          <div className="flex flex-col gap-2">
            {reportes.slice(0, 5).map((reporte) => (
              <Link key={reporte.id} href={`/admin/reportes#reporte-${reporte.id}`}>
                <CardLink className="flex items-start justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900 dark:text-slate-50">{reporte.descripcion}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {reporte.reportante_tipo === "estudiante" ? "Estudiante" : "Docente"} · {ETIQUETAS_CATEGORIA[reporte.categoria] ?? reporte.categoria} · {ESTADOS_REPORTE[reporte.estado] ?? reporte.estado}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-indigo-600 dark:text-indigo-400">Ver</span>
                </CardLink>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
