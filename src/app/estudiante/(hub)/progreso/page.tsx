import { CheckCircle2, Flame, NotebookPen, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireEstudiante } from "@/lib/requerir-estudiante";
import PageHeader from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import ProgressBar from "@/components/ui/progress-bar";
import EmptyState from "@/components/ui/empty-state";
import MetricCard from "@/components/ui/metric-card";
import { calcularRacha } from "@/lib/racha";
import { casoCalibracion } from "@/lib/calibracion-confianza";
import { temaUnidad } from "@/lib/unidad-tema";

export default async function ProgresoEstudiante() {
  const supabase = await createClient();
  const estudiante = await requireEstudiante(supabase);

  const [{ data: unidades }, { data: entregas }, { data: predicciones }, { data: bitacoras }, { data: reflexionesCierre }] =
    await Promise.all([
      supabase.from("unidades").select("id, nombre, orden, actividades(id)").order("orden"),
      supabase
        .from("entregas")
        .select("actividad_id, puntaje_auto, created_at")
        .eq("estudiante_id", estudiante.id),
      supabase
        .from("reflexiones")
        .select("actividad_id, confianza")
        .eq("estudiante_id", estudiante.id)
        .eq("momento", "prediccion")
        .not("confianza", "is", null),
      supabase.from("bitacora").select("unidad_id, cumplida").eq("estudiante_id", estudiante.id),
      supabase
        .from("reflexiones")
        .select("unidad_id")
        .eq("estudiante_id", estudiante.id)
        .eq("momento", "cierre")
        .not("unidad_id", "is", null),
    ]);

  const idsCompletadas = new Set((entregas ?? []).map((e) => e.actividad_id));
  const unidadesConProgreso = (unidades ?? []).map((u) => {
    const total = u.actividades.length;
    const hechas = u.actividades.filter((a) => idsCompletadas.has(a.id)).length;
    return { ...u, total, hechas, pct: total > 0 ? Math.round((hechas / total) * 100) : 0 };
  });

  const racha = calcularRacha((entregas ?? []).map((e) => e.created_at));

  const conCalibracion = (predicciones ?? [])
    .map((p) => {
      const entrega = entregas?.find((e) => e.actividad_id === p.actividad_id);
      return entrega?.puntaje_auto != null ? casoCalibracion(p.confianza, entrega.puntaje_auto) : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);
  const bienCalibradas = conCalibracion.filter(
    (c) => c === "bien_calibrado_alto" || c === "bien_calibrado_bajo",
  ).length;

  const metasCumplidas = (bitacoras ?? []).filter((b) => b.cumplida).length;
  const totalUnidades = unidadesConProgreso.length;
  const reflexionesCerradas = new Set((reflexionesCierre ?? []).map((r) => r.unidad_id)).size;

  const sinDatos = idsCompletadas.size === 0;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-6 px-6 py-10">
      <PageHeader
        volverHref="/estudiante/inicio"
        titulo="Mi progreso"
        descripcion="Cómo vas en el curso (solo tú lo ves)."
      />

      {sinDatos ? (
        <EmptyState
          icon={Target}
          titulo="Todavía no hay avance que mostrar"
          descripcion="Cuando completes tu primera actividad, vas a ver aquí cómo vas."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard etiqueta="Racha" valor={`${racha} ${racha === 1 ? "día" : "días"}`} icon={Flame} tono="amber" />
            <MetricCard
              etiqueta="Reflexiones de cierre"
              valor={`${reflexionesCerradas}/${totalUnidades}`}
              icon={NotebookPen}
              tono="indigo"
            />
          </div>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-slate-900 dark:text-slate-50">Avance por unidad</h2>
            <Card className="flex flex-col gap-4 p-5">
              {unidadesConProgreso.map((u) => {
                const tema = temaUnidad(u.orden);
                return (
                  <div key={u.id}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="text-slate-700 dark:text-slate-300">
                        Unidad {u.orden}. {u.nombre}
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-50">
                        {u.hechas}/{u.total}
                      </span>
                    </div>
                    <ProgressBar porcentaje={u.pct} gradiente={tema.barra} />
                  </div>
                );
              })}
            </Card>
          </section>

          {conCalibracion.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-slate-900 dark:text-slate-50">Autoconocimiento</h2>
              <Card className="flex items-center gap-3 p-5">
                <Target className="size-8 shrink-0 text-indigo-500" aria-hidden="true" />
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Le atinas a tu seguridad en{" "}
                  <strong className="text-slate-900 dark:text-slate-50">
                    {bienCalibradas} de {conCalibracion.length}
                  </strong>{" "}
                  actividades (tu confianza antes de empezar coincidió con tu resultado real).
                </p>
              </Card>
            </section>
          )}

          {totalUnidades > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-slate-900 dark:text-slate-50">Metas cumplidas</h2>
              <Card className="flex items-center gap-3 p-5">
                <CheckCircle2 className="size-8 shrink-0 text-emerald-500" aria-hidden="true" />
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Cumples las metas que te propones en{" "}
                  <strong className="text-slate-900 dark:text-slate-50">
                    {metasCumplidas}/{totalUnidades}
                  </strong>{" "}
                  unidades.
                </p>
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}
