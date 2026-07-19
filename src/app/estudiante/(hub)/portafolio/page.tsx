import { FolderHeart, Quote, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireEstudiante } from "@/lib/requerir-estudiante";
import { resumenRespuesta } from "@/lib/resumen-respuesta";
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
    supabase
      .from("unidades")
      .select(
        `id, nombre, orden,
         actividades(id, titulo, tipos_actividad(nombre),
           entregas(respuesta, created_at)
         )`,
      )
      .order("orden"),
    supabase
      .from("autoevaluaciones_confianza")
      .select("unidad_id, momento, valor")
      .eq("estudiante_id", estudiante.id),
    supabase
      .from("reflexiones")
      .select("unidad_id, texto")
      .eq("estudiante_id", estudiante.id)
      .eq("momento", "cierre")
      .not("unidad_id", "is", null),
  ]);

  const secciones = (unidades ?? []).map((u) => {
    const confInicio = confianzas?.find((c) => c.unidad_id === u.id && c.momento === "inicio");
    const confCierre = confianzas?.find((c) => c.unidad_id === u.id && c.momento === "cierre");
    const reflexion = reflexiones?.find((r) => r.unidad_id === u.id);
    const actividadesCompletadas = u.actividades.filter(
      (a) => Array.isArray(a.entregas) && a.entregas.length > 0,
    );
    return { u, confInicio, confCierre, reflexion, actividadesCompletadas };
  });

  const hayContenido = secciones.some((s) => s.actividadesCompletadas.length > 0 || s.confInicio);

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
          descripcion="Completa actividades en tus unidades y aparecerán aquí automáticamente."
        />
      )}

      {secciones.map(({ u, confInicio, confCierre, reflexion, actividadesCompletadas }) => {
        if (actividadesCompletadas.length === 0 && !confInicio) return null;

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
            {reflexion?.texto && (
              <p className="flex gap-1.5 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm italic text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
                <Quote className="size-3.5 shrink-0 translate-y-0.5" aria-hidden="true" />
                {reflexion.texto}
              </p>
            )}
            <div className="flex flex-col gap-2.5">
              {actividadesCompletadas.map((a) => {
                const tipo = Array.isArray(a.tipos_actividad) ? a.tipos_actividad[0] : a.tipos_actividad;
                const entrega = Array.isArray(a.entregas) ? a.entregas[0] : a.entregas;
                return (
                  <Card key={a.id} className="p-4">
                    <p className="font-medium text-slate-900 dark:text-slate-50">{a.titulo}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {resumenRespuesta(tipo?.nombre, entrega?.respuesta ?? {})}
                    </p>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
