import Link from "next/link";
import { CalendarDays, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireEstudiante } from "@/lib/requerir-estudiante";
import PageHeader from "@/components/ui/page-header";
import { Card, CardLink } from "@/components/ui/card";
import Badge from "@/components/ui/badge";
import EmptyState from "@/components/ui/empty-state";
import { actividadAbierta, TIPOS_EVENTO, TipoEvento, diasFaltantes, textoFaltan } from "@/lib/eventos";
import { proximoRepaso } from "@/lib/calendario-repaso";

export default async function CalendarioEstudiante() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const estudiante = await requireEstudiante<{ id: string; grupo_id: string }>(
    supabase,
    "id, grupo_id",
  );

  const [{ data: eventos }, { data: unidades }, { data: actividades }, { data: entregas }] = await Promise.all([
    supabase
      .from("eventos")
      .select("id, titulo, tipo, fecha, unidad_id, actividad_id")
      .eq("grupo_id", estudiante.grupo_id)
      .order("fecha"),
    admin.from("unidades").select("id, nombre, orden"),
    admin.from("actividades").select("id, titulo, unidad_id"),
    supabase
      .from("entregas")
      .select("actividad_id, puntaje_auto, created_at")
      .eq("estudiante_id", estudiante.id),
  ]);

  const idsCompletadas = new Set((entregas ?? []).map((e) => e.actividad_id));

  function recomendacionPara(unidadId: string): string[] {
    const actsUnidad = (actividades ?? []).filter((a) => a.unidad_id === unidadId);
    const sinHacer = actsUnidad.filter((a) => !idsCompletadas.has(a.id)).map((a) => a.titulo);
    const bajoPuntaje = actsUnidad
      .map((a) => ({ a, en: entregas?.find((e) => e.actividad_id === a.id) }))
      .filter((x) => x.en && x.en.puntaje_auto !== null && x.en.puntaje_auto < 70)
      .map((x) => x.a.titulo);
    return [...bajoPuntaje, ...sinHacer].slice(0, 3);
  }

  const itemsEventos = (eventos ?? []).map((ev) => ({
    tipo: "evento" as const,
    fecha: ev.fecha,
    titulo: ev.titulo,
    tipoEvento: ev.tipo as TipoEvento,
    actividadId: ev.actividad_id,
    unidad: unidades?.find((u) => u.id === ev.unidad_id),
    recomendaciones: recomendacionPara(ev.unidad_id),
  }));

  const itemsRepaso = (entregas ?? [])
    .filter((e) => e.puntaje_auto !== null && e.puntaje_auto < 70)
    .map((e) => {
      const act = actividades?.find((a) => a.id === e.actividad_id);
      const { fecha, vencido } = proximoRepaso(e.created_at);
      return {
        tipo: "repaso" as const,
        fecha,
        vencido,
        actividadId: e.actividad_id,
        titulo: act?.titulo ?? "Actividad",
        puntaje: e.puntaje_auto as number,
      };
    });

  const timeline = [...itemsEventos, ...itemsRepaso].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const proximoItem = timeline.find((item) => diasFaltantes(item.fecha) >= 0) ?? timeline[0];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <PageHeader
        volverHref="/estudiante/inicio"
        titulo="Calendario"
        descripcion="Las fechas del curso y cuándo te conviene repasar."
      />

      {timeline.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          accion={
            <Link
              href="/estudiante/inicio"
              className="text-sm font-medium text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-400"
            >
              Volver a mi ruta
            </Link>
          }
          titulo="Todavía no hay nada que mostrar aquí"
          descripcion="Cuando haya una fecha o tengas actividades por repasar, van a aparecer aquí."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {proximoItem && (
            <Card className="relative overflow-hidden border-indigo-100 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/70 p-5 dark:border-indigo-900/70 dark:from-indigo-950/40 dark:via-slate-900 dark:to-violet-950/25">
              <div aria-hidden="true" className="absolute -right-8 -top-8 size-28 rounded-full bg-violet-200/45 blur-2xl dark:bg-violet-800/20" />
              <p className="relative text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-600 dark:text-indigo-400">Lo próximo en tu ruta</p>
              <p className="relative mt-1 text-lg font-bold text-slate-900 dark:text-slate-50">
                {proximoItem.tipo === "repaso" ? `Repasa “${proximoItem.titulo}”` : proximoItem.titulo}
              </p>
              <p className="relative mt-1 text-sm text-slate-600 dark:text-slate-300">{textoFaltan(diasFaltantes(proximoItem.fecha))}</p>
            </Card>
          )}
          <div className="relative flex flex-col gap-3 before:absolute before:bottom-5 before:left-5 before:top-5 before:w-px before:bg-gradient-to-b before:from-indigo-300 before:via-violet-200 before:to-cyan-200 dark:before:from-indigo-800 dark:before:via-violet-900 dark:before:to-cyan-900">
          {timeline.map((item, i) => {
            if (item.tipo === "evento") {
              const dias = diasFaltantes(item.fecha);
              const conector = TIPOS_EVENTO[item.tipoEvento].conector;
              return (
                <Card key={`ev-${i}`} className="relative ml-11 flex flex-col gap-2.5 p-4">
                  <span aria-hidden="true" className="absolute -left-[2.95rem] top-5 flex size-5 items-center justify-center rounded-full border-4 border-slate-50 bg-indigo-500 shadow-sm dark:border-slate-950" />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                      <p className="font-medium text-slate-900 dark:text-slate-50">{item.titulo}</p>
                    </div>
                    <Badge tono="indigo">{TIPOS_EVENTO[item.tipoEvento].etiqueta}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {textoFaltan(dias)} · Unidad {item.unidad?.orden}
                  </p>
                  {item.tipoEvento === "apertura_actividad" ? (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {actividadAbierta(item.fecha)
                          ? "Llegó su fecha de apertura. Si cumpliste los requisitos previos, ya puedes comenzar."
                          : "Podrás comenzar esta actividad desde esta fecha."}
                      </p>
                      {actividadAbierta(item.fecha) && item.actividadId && (
                        <Link
                          href={`/estudiante/actividad/${item.actividadId}`}
                          className="shrink-0 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          Abrir actividad
                        </Link>
                      )}
                    </div>
                  ) : item.recomendaciones.length > 0 ? (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {conector}: {item.recomendaciones.join(", ")}
                    </p>
                  ) : null}
                </Card>
              );
            }
            return (
              <Link key={`rp-${i}`} href={`/estudiante/actividad/${item.actividadId}`} className="relative ml-11">
                <span aria-hidden="true" className="absolute -left-[2.95rem] top-5 z-10 flex size-5 items-center justify-center rounded-full border-4 border-slate-50 bg-amber-500 shadow-sm dark:border-slate-950" />
                <CardLink className="flex items-center gap-3 px-4 py-3">
                  <RotateCcw className="size-4 shrink-0 text-slate-400 dark:text-slate-400" aria-hidden="true" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{item.titulo}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Repaso sugerido · {item.vencido ? "atrasado" : textoFaltan(diasFaltantes(item.fecha))}
                    </p>
                  </div>
                  <Badge tono="warning">{item.puntaje}% correcto</Badge>
                </CardLink>
              </Link>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
