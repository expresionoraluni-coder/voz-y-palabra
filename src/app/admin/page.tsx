import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle2, Clock3, MessageSquareText, ShieldCheck, Timer, Users, UserRound } from "lucide-react";
import { requerirAdministrador } from "@/lib/supabase/requerir-administrador";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardLink } from "@/components/ui/card";
import MetricCard from "@/components/ui/metric-card";
import EmptyState from "@/components/ui/empty-state";
import { revisarErrorConsulta } from "@/lib/revisar-error-consulta";
import { ETIQUETAS_CATEGORIA, ESTADOS_REPORTE } from "@/lib/reportes-constantes";
import { timestampHace24Horas } from "@/lib/fecha-servidor";

const ESTADOS_PENDIENTES = ["recibido", "en_revision", "necesita_informacion"];

export default async function AdminDashboard() {
  const { supabase, administrador, mfa } = await requerirAdministrador({ permitirConfiguracionMfa: true });

  if (!mfa.tieneFactorVerificado) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-8 px-6 py-10">
        <section className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Panel administrativo</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Activa tu protección para continuar</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Tu cuenta administrativa está reconocida. Solo falta configurar una aplicación autenticadora; después podrás atender reportes y administrar la ayuda.
          </p>
        </section>

        <Card className="flex flex-col gap-4 border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/70 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
            <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-slate-50">No es un error de acceso</p>
              <p className="mt-1">Los reportes contienen información privada, por eso permanecen ocultos hasta confirmar el segundo factor.</p>
            </div>
          </div>
          <Link href="/admin/seguridad?configurar=1" className="inline-flex w-fit items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            Configurar seguridad
          </Link>
        </Card>

        <Card className="p-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          <p className="font-semibold text-slate-900 dark:text-slate-50">Son solo tres pasos</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>Abre Seguridad y genera el código QR.</li>
            <li>Escanéalo con Google Authenticator, Microsoft Authenticator u otra app compatible.</li>
            <li>Escribe el código de seis dígitos para desbloquear el panel.</li>
          </ol>
        </Card>
      </div>
    );
  }

  const adminDb = createAdminClient();
  const hace24Horas = timestampHace24Horas();
  const ahora = new Date().toISOString();

  const [
    { data: reportes, error: reportesError },
    { count: reportesPendientesCount, error: pendientesError },
    { count: reportes24hCount, error: reportes24hError },
    { count: reportesUrgentesCount, error: urgentesError },
    { count: reportesVencidosCount, error: vencidosError },
    { count: gruposCount, error: gruposError },
    { count: estudiantesActivosCount, error: estudiantesError },
    { count: docentesCount, error: docentesError },
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
    supabase
      .from("reportes")
      .select("id", { count: "exact", head: true })
      .gte("created_at", hace24Horas),
    supabase
      .from("reportes")
      .select("id", { count: "exact", head: true })
      .in("estado", ESTADOS_PENDIENTES)
      .in("prioridad", ["urgente", "alta"]),
    supabase
      .from("reportes")
      .select("id", { count: "exact", head: true })
      .in("estado", ESTADOS_PENDIENTES)
      .lt("fecha_limite", ahora),
    supabase.from("grupos").select("id", { count: "exact", head: true }),
    adminDb.from("estudiantes").select("id", { count: "exact", head: true }).eq("activo", true),
    supabase.from("docentes").select("id", { count: "exact", head: true }),
  ]);

  revisarErrorConsulta(reportesError, "No pudimos cargar los reportes de atención.");
  revisarErrorConsulta(pendientesError, "No pudimos contar los reportes pendientes.");
  revisarErrorConsulta(reportes24hError, "No pudimos contar los reportes recientes.");
  revisarErrorConsulta(urgentesError, "No pudimos contar los reportes prioritarios.");
  revisarErrorConsulta(vencidosError, "No pudimos contar los reportes vencidos.");
  revisarErrorConsulta(gruposError, "No pudimos cargar los grupos para el monitoreo.");
  revisarErrorConsulta(estudiantesError, "No pudimos cargar el resumen de estudiantes.");
  revisarErrorConsulta(docentesError, "No pudimos cargar el resumen docente.");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Panel administrativo</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Centro de atención de la plataforma</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Aquí se atienden los problemas que estudiantes o docentes no pueden resolver desde sus propios paneles.
          También puedes observar el estado general sin entrar como docente.
        </p>
      </section>

      <section aria-label="Resumen de la plataforma" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-8">
        <MetricCard etiqueta="Reportes pendientes" valor={reportesPendientesCount ?? 0} icon={MessageSquareText} tono="amber" />
        <MetricCard etiqueta="Reportes últimas 24 h" valor={reportes24hCount ?? 0} icon={Clock3} tono="indigo" />
        <MetricCard etiqueta="Alta prioridad" valor={reportesUrgentesCount ?? 0} icon={AlertTriangle} tono="amber" />
        <MetricCard etiqueta="Vencidos" valor={reportesVencidosCount ?? 0} icon={Timer} tono="amber" />
        <MetricCard etiqueta="Grupos" valor={gruposCount ?? 0} icon={Users} tono="indigo" />
        <MetricCard etiqueta="Estudiantes activos" valor={estudiantesActivosCount ?? 0} icon={Activity} tono="emerald" />
        <MetricCard etiqueta="Docentes" valor={docentesCount ?? 0} icon={UserRound} tono="slate" />
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
            Cada reporte conserva el contexto de la pantalla, recibe una prioridad inicial y evita duplicados del mismo caso durante 24 horas. El panel se desconecta después de 30 minutos sin actividad y no guarda sus pantallas en caché.
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
