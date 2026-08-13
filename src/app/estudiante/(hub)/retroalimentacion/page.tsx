import Link from "next/link";
import { ArrowLeft, CheckCircle2, MessageCircle, PenLine } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireEstudiante } from "@/lib/requerir-estudiante";
import PageHeader from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import Badge from "@/components/ui/badge";
import EmptyState from "@/components/ui/empty-state";

function fechaComentario(fecha: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(fecha));
}

export default async function RetroalimentacionEstudiante() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const estudiante = await requireEstudiante<{ id: string }>(supabase, "id");

  const { data: entregas } = await admin
    .from("entregas")
    .select("id, actividad_id, puntaje_auto, estado, created_at")
    .eq("estudiante_id", estudiante.id);

  const entregaIds = (entregas ?? []).map((entrega) => entrega.id);
  const [{ data: comentarios }, { data: actividades }] = entregaIds.length
    ? await Promise.all([
        admin
          .from("retroalimentacion_docente")
          .select("id, entrega_id, comentario, created_at")
          .in("entrega_id", entregaIds)
          .order("created_at", { ascending: false }),
        admin
          .from("actividades")
          .select("id, titulo, unidad_id, unidades(nombre, orden)")
          .in("id", (entregas ?? []).map((entrega) => entrega.actividad_id)),
      ])
    : [{ data: [] }, { data: [] }];

  const entregaPorId = new Map((entregas ?? []).map((entrega) => [entrega.id, entrega]));
  const actividadPorId = new Map((actividades ?? []).map((actividad) => [actividad.id, actividad]));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <PageHeader
        volverHref="/estudiante/inicio"
        eyebrow={`${comentarios?.length ?? 0} comentario${comentarios?.length === 1 ? "" : "s"}`}
        titulo="Retroalimentación"
        descripcion="Los comentarios de tu profesora sobre tus actividades aparecen aquí para que puedas retomarlos."
      />

      {!comentarios || comentarios.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          titulo="Todavía no hay comentarios"
          descripcion="Cuando tu profesora revise una actividad, su comentario aparecerá en esta sección."
          accion={
            <Link
              href="/estudiante/inicio"
              className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-400"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Volver a mi ruta
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {comentarios.map((comentario) => {
            const entrega = entregaPorId.get(comentario.entrega_id);
            const actividad = entrega ? actividadPorId.get(entrega.actividad_id) : null;
            const unidad = actividad?.unidades;
            const unidadDato = Array.isArray(unidad) ? unidad[0] : unidad;
            return (
              <Card key={comentario.id} className="flex flex-col gap-4 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                    <PenLine className="size-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-slate-900 dark:text-slate-50">
                      {actividad?.titulo ?? "Actividad"}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {unidadDato ? `Unidad ${unidadDato.orden}. ${unidadDato.nombre}` : "Actividad del curso"}
                    </p>
                  </div>
                  {entrega?.estado === "revisada" ? (
                    <Badge tono="success">
                      <CheckCircle2 className="size-3" aria-hidden="true" />
                      Revisada
                    </Badge>
                  ) : (
                    <Badge tono="warning">Comentario</Badge>
                  )}
                </div>
                <blockquote className="border-l-2 border-amber-300 pl-4 text-sm leading-relaxed text-slate-700 dark:border-amber-700 dark:text-slate-300">
                  {comentario.comentario}
                </blockquote>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Comentario de tu profesora</span>
                  <time dateTime={comentario.created_at}>{fechaComentario(comentario.created_at)}</time>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
