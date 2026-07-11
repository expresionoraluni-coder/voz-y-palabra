import { redirect, notFound } from "next/navigation";
import { Award, FileText, Quote } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resumenRespuesta } from "@/lib/resumen-respuesta";
import ComentarioEntrega from "./comentario-entrega";
import ReiniciarNip from "./reiniciar-nip";
import PageHeader from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import Badge from "@/components/ui/badge";
import ProgressBar from "@/components/ui/progress-bar";
import Avatar from "@/components/ui/avatar";
import EmptyState from "@/components/ui/empty-state";
import { temaUnidad } from "@/lib/unidad-tema";

export default async function FichaEstudiante({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingreso/profesora");

  const { data: estudiante } = await supabase
    .from("estudiantes")
    .select("id, nombre, grupo_id, grupos(nombre)")
    .eq("id", id)
    .single();
  if (!estudiante) notFound();

  const grupo = Array.isArray(estudiante.grupos) ? estudiante.grupos[0] : estudiante.grupos;

  const [
    { data: unidades },
    { data: entregas },
    { data: confianzas },
    { data: reflexiones },
    { data: insignias },
  ] = await Promise.all([
    supabase
      .from("unidades")
      .select("id, nombre, orden, actividades(id)")
      .order("orden"),
    supabase
      .from("entregas")
      .select("id, respuesta, estado, created_at, actividades(titulo, unidad_id, tipos_actividad(nombre))")
      .eq("estudiante_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("autoevaluaciones_confianza")
      .select("unidad_id, momento, valor")
      .eq("estudiante_id", id),
    supabase
      .from("reflexiones")
      .select("texto, created_at, actividades(titulo)")
      .eq("estudiante_id", id)
      .eq("momento", "cierre")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("insignias_otorgadas")
      .select("insignias(nombre)")
      .eq("estudiante_id", id),
  ]);

  const totalActividades = unidades?.reduce((s, u) => s + u.actividades.length, 0) ?? 0;
  const avanceGeneral = totalActividades > 0 ? Math.round(((entregas?.length ?? 0) / totalActividades) * 100) : 0;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <div className="flex items-start gap-4">
        <Avatar nombre={estudiante.nombre} size="lg" />
        <div className="flex-1">
          <PageHeader
            volverHref={`/docente/grupos/${estudiante.grupo_id}`}
            volverTexto={grupo?.nombre ?? "Grupo"}
            titulo={estudiante.nombre}
            descripcion={`Avance general: ${avanceGeneral}% · ${entregas?.length ?? 0}/${totalActividades} actividades`}
            accion={<ReiniciarNip estudianteId={estudiante.id} nombre={estudiante.nombre} />}
          />
        </div>
      </div>

      {insignias && insignias.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {insignias.map((i, idx) => {
            const ins = Array.isArray(i.insignias) ? i.insignias[0] : i.insignias;
            return (
              <Badge key={idx} tono="warning">
                <Award className="size-3" aria-hidden="true" />
                {ins?.nombre}
              </Badge>
            );
          })}
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          Avance y confianza por unidad
        </h2>
        <Card className="flex flex-col gap-4 p-5">
          {unidades?.map((u) => {
            const hechas = entregas?.filter((en) => {
              const act = Array.isArray(en.actividades) ? en.actividades[0] : en.actividades;
              return act?.unidad_id === u.id;
            }).length ?? 0;
            const pct = u.actividades.length > 0 ? Math.round((hechas / u.actividades.length) * 100) : 0;
            const inicio = confianzas?.find((c) => c.unidad_id === u.id && c.momento === "inicio");
            const cierre = confianzas?.find((c) => c.unidad_id === u.id && c.momento === "cierre");
            return (
              <div key={u.id}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">
                    Unidad {u.orden}. {u.nombre}
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-50">{pct}%</span>
                </div>
                <ProgressBar porcentaje={pct} gradiente={temaUnidad(u.orden).barra} />
                {inicio && (
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-500">
                    Confianza: {inicio.valor}% al inicio{" "}
                    {cierre ? `→ ${cierre.valor}% al cierre` : "(sin cierre aún)"}
                  </p>
                )}
              </div>
            );
          })}
        </Card>
      </section>

      {reflexiones && reflexiones.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Reflexiones recientes
          </h2>
          <div className="flex flex-col gap-2">
            {reflexiones.map((r, i) => {
              const act = Array.isArray(r.actividades) ? r.actividades[0] : r.actividades;
              return (
                <Card key={i} className="flex gap-2.5 p-3.5">
                  <Quote className="mt-0.5 size-3.5 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-500">{act?.titulo}</p>
                    <p className="text-sm text-slate-800 dark:text-slate-200">{r.texto}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Entregas</h2>
        {!entregas || entregas.length === 0 ? (
          <EmptyState icon={FileText} titulo="Todavía no hay entregas" />
        ) : (
          <div className="flex flex-col gap-2.5">
            {entregas.map((en) => {
              const act = Array.isArray(en.actividades) ? en.actividades[0] : en.actividades;
              const tipo = act
                ? Array.isArray(act.tipos_actividad)
                  ? act.tipos_actividad[0]
                  : act.tipos_actividad
                : undefined;
              return (
                <Card key={en.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900 dark:text-slate-50">{act?.titulo}</p>
                    {en.estado === "pendiente_revision" && <Badge tono="warning">Por revisar</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {resumenRespuesta(tipo?.nombre, en.respuesta ?? {})}
                  </p>
                  <ComentarioEntrega entregaId={en.id} pendienteRevision={en.estado === "pendiente_revision"} />
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
