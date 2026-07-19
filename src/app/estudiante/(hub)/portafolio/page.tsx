import { FolderHeart, Quote, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireEstudiante } from "@/lib/requerir-estudiante";
import BotonImprimir from "./boton-imprimir";
import PageHeader from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import EmptyState from "@/components/ui/empty-state";

type Grupo = { nombre: string } | { nombre: string }[] | null;

export default async function Portafolio() {
  const supabase = await createClient();
  const estudiante = await requireEstudiante<{ id: string; nombre: string; grupos: Grupo }>(
    supabase,
    "id, nombre, grupos(nombre)",
  );

  const grupo = Array.isArray(estudiante.grupos) ? estudiante.grupos[0] : estudiante.grupos;

  const [{ data: unidades }, { data: confianzas }, { data: reflexiones }] = await Promise.all([
    supabase.from("unidades").select("id, nombre, orden").order("orden"),
    supabase
      .from("autoevaluaciones_confianza")
      .select("unidad_id, momento, valor")
      .eq("estudiante_id", estudiante.id),
    // Trae tanto las reflexiones de cierre por unidad (unidad_id set) como
    // las de cierre por actividad (actividad_id set) — el portafolio ahora
    // solo compila reflexiones, nunca entregas.
    supabase
      .from("reflexiones")
      .select("unidad_id, texto, actividades(titulo, unidad_id)")
      .eq("estudiante_id", estudiante.id)
      .eq("momento", "cierre")
      .order("created_at"),
  ]);

  const secciones = (unidades ?? []).map((u) => {
    const confInicio = confianzas?.find((c) => c.unidad_id === u.id && c.momento === "inicio");
    const confCierre = confianzas?.find((c) => c.unidad_id === u.id && c.momento === "cierre");
    const reflexionUnidad = reflexiones?.find((r) => r.unidad_id === u.id);
    const reflexionesActividad = (reflexiones ?? []).filter((r) => {
      const act = Array.isArray(r.actividades) ? r.actividades[0] : r.actividades;
      return act?.unidad_id === u.id;
    });
    return { u, confInicio, confCierre, reflexionUnidad, reflexionesActividad };
  });

  const hayContenido = secciones.some(
    (s) => s.confInicio || s.reflexionUnidad || s.reflexionesActividad.length > 0,
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-6 py-10 print:px-0">
      <div className="flex items-center justify-between print:hidden">
        <PageHeader
          volverHref="/estudiante/inicio"
          titulo={`Portafolio de ${estudiante.nombre}`}
          descripcion={`Grupo ${grupo?.nombre ?? "—"}`}
        />
        <BotonImprimir />
      </div>

      {!hayContenido && (
        <EmptyState
          icon={FolderHeart}
          titulo="Tu portafolio está vacío por ahora"
          descripcion="Tus reflexiones de actividades y unidades aparecerán aquí automáticamente."
        />
      )}

      {secciones.map(({ u, confInicio, confCierre, reflexionUnidad, reflexionesActividad }) => {
        if (!confInicio && !reflexionUnidad && reflexionesActividad.length === 0) return null;

        return (
          <section key={u.id} className="flex flex-col gap-3 break-inside-avoid">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                Unidad {u.orden}. {u.nombre}
              </h2>
              {confInicio && (
                <span className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-500">
                  <TrendingUp className="size-3.5" aria-hidden="true" />
                  {confInicio.valor}%{confCierre ? ` → ${confCierre.valor}%` : " (en curso)"}
                </span>
              )}
            </div>
            {reflexionUnidad?.texto && (
              <p className="flex gap-1.5 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm italic text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
                <Quote className="size-3.5 shrink-0 translate-y-0.5" aria-hidden="true" />
                {reflexionUnidad.texto}
              </p>
            )}
            {reflexionesActividad.length > 0 && (
              <div className="flex flex-col gap-2.5">
                {reflexionesActividad.map((r, i) => {
                  const act = Array.isArray(r.actividades) ? r.actividades[0] : r.actividades;
                  return (
                    <Card key={i} className="p-4">
                      <p className="font-medium text-slate-900 dark:text-slate-50">{act?.titulo}</p>
                      <p className="mt-1 flex gap-1.5 text-sm italic text-slate-600 dark:text-slate-400">
                        <Quote className="size-3.5 shrink-0 translate-y-0.5" aria-hidden="true" />
                        {r.texto}
                      </p>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
