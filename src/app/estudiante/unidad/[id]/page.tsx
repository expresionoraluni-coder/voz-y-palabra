import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { CheckCircle2, Circle, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Confianza from "./confianza";
import Bitacora from "./bitacora";
import PageHeader from "@/components/ui/page-header";
import { CardLink } from "@/components/ui/card";
import ProgressBar from "@/components/ui/progress-bar";
import EmptyState from "@/components/ui/empty-state";
import { temaUnidad } from "@/lib/unidad-tema";

export default async function UnidadEstudiante({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingreso/estudiante");

  const { data: estudiante } = await supabase
    .from("estudiantes")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();
  if (!estudiante) redirect("/ingreso/estudiante");

  const { data: unidad } = await supabase
    .from("unidades")
    .select("id, nombre, orden, reto_comunicativo")
    .eq("id", id)
    .single();
  if (!unidad) notFound();

  const { data: actividades } = await supabase
    .from("actividades")
    .select("id, titulo, instrucciones, entregas(id)")
    .eq("unidad_id", id)
    .order("orden");

  const { data: confianzas } = await supabase
    .from("autoevaluaciones_confianza")
    .select("momento, valor")
    .eq("estudiante_id", estudiante.id)
    .eq("unidad_id", id);

  const { data: bitacora } = await supabase
    .from("bitacora")
    .select("meta, cumplida")
    .eq("estudiante_id", estudiante.id)
    .eq("unidad_id", id)
    .maybeSingle();

  const confianzaInicio = confianzas?.find((c) => c.momento === "inicio");
  const confianzaCierre = confianzas?.find((c) => c.momento === "cierre");

  const totalActividades = actividades?.length ?? 0;
  const completadas =
    actividades?.filter((a) => Array.isArray(a.entregas) && a.entregas.length > 0)
      .length ?? 0;
  const unidadCompleta = totalActividades > 0 && completadas === totalActividades;
  const pct = totalActividades > 0 ? Math.round((completadas / totalActividades) * 100) : 0;
  const tema = temaUnidad(unidad.orden);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <PageHeader
        volverHref="/estudiante/inicio"
        eyebrow={`Unidad ${unidad.orden}`}
        titulo={unidad.nombre}
        descripcion={unidad.reto_comunicativo}
      />

      {totalActividades > 0 && (
        <div className="flex items-center gap-3">
          <ProgressBar porcentaje={pct} gradiente={tema.barra} />
          <span className="shrink-0 text-sm font-medium text-slate-500 dark:text-slate-500">
            {completadas}/{totalActividades}
          </span>
        </div>
      )}

      <Bitacora
        estudianteId={estudiante.id}
        unidadId={id}
        metaPrevia={bitacora?.meta ?? null}
        cumplidaPrevia={bitacora?.cumplida ?? false}
        avancePct={pct}
      />

      {!confianzaInicio && (
        <Confianza estudianteId={estudiante.id} unidadId={id} momento="inicio" />
      )}

      {!actividades || actividades.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          titulo="Todavía no hay actividades publicadas"
          descripcion="Tu profesora las agregará pronto."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {actividades.map((a) => {
            const completada = Array.isArray(a.entregas) && a.entregas.length > 0;
            return (
              <Link key={a.id} href={`/estudiante/actividad/${a.id}`}>
                <CardLink className="flex items-center gap-3 px-4 py-3.5">
                  {completada ? (
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-500" aria-hidden="true" />
                  ) : (
                    <Circle className="size-5 shrink-0 text-slate-300 dark:text-slate-700" aria-hidden="true" />
                  )}
                  <span className="flex-1 font-medium text-slate-900 dark:text-slate-50">
                    {a.titulo}
                  </span>
                  <span
                    className={
                      completada
                        ? "text-xs font-medium text-emerald-600 dark:text-emerald-400"
                        : "text-xs text-slate-400 dark:text-slate-600"
                    }
                  >
                    {completada ? "Completada" : "Sin empezar"}
                  </span>
                </CardLink>
              </Link>
            );
          })}
        </div>
      )}

      {unidadCompleta && !confianzaCierre && (
        <Confianza estudianteId={estudiante.id} unidadId={id} momento="cierre" />
      )}

      {confianzaInicio && confianzaCierre && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/40">
          <TrendingUp className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Tu confianza pasó de <strong className="text-slate-900 dark:text-slate-50">{confianzaInicio.valor}%</strong> a{" "}
            <strong className="text-slate-900 dark:text-slate-50">{confianzaCierre.valor}%</strong> en esta unidad.
          </p>
        </div>
      )}
    </div>
  );
}
