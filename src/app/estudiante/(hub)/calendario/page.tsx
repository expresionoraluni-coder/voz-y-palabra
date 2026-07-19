import Link from "next/link";
import { CalendarDays, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireEstudiante } from "@/lib/requerir-estudiante";
import PageHeader from "@/components/ui/page-header";
import { Card, CardLink } from "@/components/ui/card";
import Badge from "@/components/ui/badge";
import EmptyState from "@/components/ui/empty-state";
import { TIPOS_EVENTO, TipoEvento, diasFaltantes, textoFaltan } from "@/lib/eventos";
import { proximoRepaso } from "@/lib/calendario-repaso";

export default async function CalendarioEstudiante() {
  const supabase = await createClient();
  const estudiante = await requireEstudiante<{ id: string; grupo_id: string }>(
    supabase,
    "id, grupo_id",
  );

  const [{ data: eventos }, { data: unidades }, { data: actividades }, { data: entregas }] = await Promise.all([
    supabase
      .from("eventos")
      .select("id, titulo, tipo, fecha, unidad_id")
      .eq("grupo_id", estudiante.grupo_id)
      .order("fecha"),
    supabase.from("unidades").select("id, nombre, orden"),
    supabase.from("actividades").select("id, titulo, unidad_id"),
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

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <PageHeader
        volverHref="/estudiante/inicio"
        titulo="Calendario"
        descripcion="Las fechas que puso tu profesora y cuándo te conviene repasar."
      />

      {timeline.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          titulo="Todavía no hay nada que mostrar aquí"
          descripcion="Cuando tu profesora suba una fecha o tengas actividades por repasar, van a aparecer."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {timeline.map((item, i) => {
            if (item.tipo === "evento") {
              const dias = diasFaltantes(item.fecha);
              const conector = TIPOS_EVENTO[item.tipoEvento].conector;
              return (
                <Card key={`ev-${i}`} className="flex flex-col gap-2.5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                      <p className="font-medium text-slate-900 dark:text-slate-50">{item.titulo}</p>
                    </div>
                    <Badge tono="indigo">{TIPOS_EVENTO[item.tipoEvento].etiqueta}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    {textoFaltan(dias)} · Unidad {item.unidad?.orden}
                  </p>
                  {item.recomendaciones.length > 0 && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {conector}: {item.recomendaciones.join(", ")}
                    </p>
                  )}
                </Card>
              );
            }
            return (
              <Link key={`rp-${i}`} href={`/estudiante/actividad/${item.actividadId}`}>
                <CardLink className="flex items-center gap-3 px-4 py-3">
                  <RotateCcw className="size-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{item.titulo}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      Repaso sugerido · {item.vencido ? "atrasado" : textoFaltan(diasFaltantes(item.fecha))}
                    </p>
                  </div>
                  <Badge tono="warning">{item.puntaje}% correcto</Badge>
                </CardLink>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
