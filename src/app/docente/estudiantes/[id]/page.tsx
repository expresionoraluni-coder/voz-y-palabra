import { redirect, notFound } from "next/navigation";
import { Award, FileText, MessageSquareText, NotebookPen, Quote } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resumenRespuesta } from "@/lib/resumen-respuesta";
import ComentarioEntrega from "./comentario-entrega";
import ReiniciarNip from "./reiniciar-nip";
import GestionEstudiante from "./gestion-estudiante";
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
    .select("id, nombre, grupo_id, activo, grupos(nombre)")
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
    { data: predicciones },
    { data: bitacoras },
  ] = await Promise.all([
    supabase
      .from("unidades")
      .select("id, nombre, orden, actividades(id)")
      .order("orden"),
    supabase
      .from("entregas")
      .select(
        "id, actividad_id, respuesta, estado, created_at, puntaje_auto, evaluacion_docente, actividades(titulo, unidad_id, tipos_actividad(nombre))",
      )
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
    supabase
      .from("reflexiones")
      .select("actividad_id, confianza")
      .eq("estudiante_id", id)
      .eq("momento", "prediccion")
      .not("confianza", "is", null),
    supabase.from("bitacora").select("unidad_id, meta, cumplida").eq("estudiante_id", id),
  ]);

  const idsEntregas = (entregas ?? []).map((en) => en.id);
  const { data: comentarios } = idsEntregas.length
    ? await supabase
        .from("retroalimentacion_docente")
        .select("entrega_id, comentario, created_at")
        .in("entrega_id", idsEntregas)
        .order("created_at", { ascending: false })
    : { data: [] };

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

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3.5 dark:border-slate-800 dark:bg-slate-900">
        <Badge tono={estudiante.activo ? "success" : "neutral"}>
          {estudiante.activo ? "Activa en el grupo" : "Dada de baja"}
        </Badge>
        <GestionEstudiante
          estudianteId={estudiante.id}
          nombre={estudiante.nombre}
          activo={estudiante.activo}
          grupoId={estudiante.grupo_id}
        />
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
            const bitacora = bitacoras?.find((b) => b.unidad_id === u.id);
            return (
              <div key={u.id}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">
                    Unidad {u.orden}. {u.nombre}
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-50">{pct}%</span>
                </div>
                <ProgressBar
                  porcentaje={pct}
                  gradiente={temaUnidad(u.orden).barra}
                  etiqueta={`Avance en Unidad ${u.orden}. ${u.nombre}: ${pct}%`}
                />
                {inicio && (
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-500">
                    Confianza: {inicio.valor}% al inicio{" "}
                    {cierre ? `→ ${cierre.valor}% al cierre` : "(sin cierre aún)"}
                  </p>
                )}
                {bitacora && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-500">
                    <NotebookPen className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                    <span>
                      Meta: "{bitacora.meta}"{" "}
                      {bitacora.cumplida ? (
                        <span className="text-emerald-600 dark:text-emerald-400">(cumplida)</span>
                      ) : (
                        "(en curso)"
                      )}
                    </span>
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
              const EVALUACION_BADGE = {
                logrado: { texto: "Logrado", tono: "success" as const },
                en_proceso: { texto: "En proceso", tono: "warning" as const },
                necesita_apoyo: { texto: "Necesita apoyo", tono: "error" as const },
              };
              const evaluacionBadge = en.evaluacion_docente
                ? EVALUACION_BADGE[en.evaluacion_docente as keyof typeof EVALUACION_BADGE]
                : null;
              const prediccion = predicciones?.find((p) => p.actividad_id === en.actividad_id);
              let toneConfianza: "neutral" | "warning" = "neutral";
              if (prediccion && en.puntaje_auto !== null) {
                const confianzaPct = (prediccion.confianza - 1) * 25;
                if (Math.abs(confianzaPct - en.puntaje_auto) > 25) toneConfianza = "warning";
              }
              return (
                <Card
                  key={en.id}
                  id={`entrega-${en.id}`}
                  className="scroll-mt-20 p-4 target:ring-2 target:ring-indigo-500 target:ring-offset-2 dark:target:ring-offset-slate-950"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900 dark:text-slate-50">{act?.titulo}</p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {en.puntaje_auto !== null && (
                        <Badge tono={en.puntaje_auto >= 70 ? "success" : en.puntaje_auto >= 40 ? "warning" : "error"}>
                          {en.puntaje_auto}% correcto
                        </Badge>
                      )}
                      {prediccion && <Badge tono={toneConfianza}>Confianza {prediccion.confianza}/5</Badge>}
                      {evaluacionBadge && <Badge tono={evaluacionBadge.tono}>{evaluacionBadge.texto}</Badge>}
                      {en.estado === "pendiente_revision" && <Badge tono="warning">Por revisar</Badge>}
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {resumenRespuesta(tipo?.nombre, en.respuesta ?? {})}
                  </p>
                  {(() => {
                    const r = (en.respuesta ?? {}) as {
                      analisisAudio?: {
                        duracionSegundos: number;
                        numPausas: number;
                        tiempoPausadoSegundos: number;
                        consistenciaVolumen?: number | null;
                      };
                      analisisTexto?: { variedadLexica: number; muletillas: number; conectores: number };
                    };
                    if (r.analisisAudio) {
                      return (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {r.analisisAudio.duracionSegundos}s de grabación · {r.analisisAudio.numPausas} pausa(s)
                          detectada(s) ({r.analisisAudio.tiempoPausadoSegundos}s en silencio)
                          {r.analisisAudio.consistenciaVolumen != null &&
                            ` · volumen ${r.analisisAudio.consistenciaVolumen >= 60 ? "estable" : "irregular"}`}
                        </p>
                      );
                    }
                    if (r.analisisTexto) {
                      return (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Variedad léxica: {r.analisisTexto.variedadLexica}%
                          {r.analisisTexto.muletillas > 0 && ` · ${r.analisisTexto.muletillas} muletilla(s)`}
                          {r.analisisTexto.conectores > 0 && ` · ${r.analisisTexto.conectores} conector(es)`}
                        </p>
                      );
                    }
                    return null;
                  })()}
                  {comentarios
                    ?.filter((c) => c.entrega_id === en.id)
                    .map((c, i) => (
                      <p
                        key={i}
                        className="mt-2 flex items-start gap-1.5 border-t border-slate-100 pt-2 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300"
                      >
                        <MessageSquareText className="mt-0.5 size-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                        <span>
                          {c.comentario}{" "}
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            ({new Date(c.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short" })})
                          </span>
                        </span>
                      </p>
                    ))}
                  <ComentarioEntrega
                    entregaId={en.id}
                    pendienteRevision={en.estado === "pendiente_revision"}
                    evaluacionInicial={en.evaluacion_docente as "logrado" | "en_proceso" | "necesita_apoyo" | null}
                  />
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
