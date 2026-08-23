import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ListChecks, Pencil, Plus, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/page-header";
import { Card, CardLink } from "@/components/ui/card";
import EmptyState from "@/components/ui/empty-state";
import { etiquetaTipo, ICONO_TIPO } from "@/lib/tipo-actividad-icono";
import ActividadVideoEditor from "./actividad-video-editor";
import { revisarErrorConsulta } from "@/lib/revisar-error-consulta";

export default async function DetalleUnidadDocente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Las tres consultas solo dependen del id de la URL, no entre sí — van
  // en paralelo en vez de tres viajes seguidos a Supabase.
  const [
    {
      data: { user },
      error: sesionError,
    },
    { data: unidad, error: unidadError },
    { data: actividades, error: actividadesError },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("unidades").select("id, nombre, orden, reto_comunicativo, unidad_competencia").eq("id", id).maybeSingle(),
    supabase
      .from("actividades")
      .select("id, titulo, orden, video_url, tipos_actividad(nombre)")
      .eq("unidad_id", id)
      .order("orden"),
  ]);

  revisarErrorConsulta(sesionError, "No pudimos validar tu sesión docente.");
  revisarErrorConsulta(unidadError, "No pudimos cargar esta unidad.");
  revisarErrorConsulta(actividadesError, "No pudimos cargar las actividades de esta unidad.");

  if (!user) redirect("/ingreso/profesora");
  if (!unidad) notFound();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <PageHeader
        volverHref="/docente/dashboard"
        eyebrow={`Unidad ${unidad.orden}`}
        titulo={unidad.nombre}
        descripcion={unidad.reto_comunicativo}
      />

      {unidad.unidad_competencia && (
        <CardLink className="border-indigo-100 bg-indigo-50/60 px-4 py-3.5 dark:border-indigo-900 dark:bg-indigo-950/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Lo que se busca desarrollar</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{unidad.unidad_competencia}</p>
        </CardLink>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Actividades del curso</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Consulta las actividades actuales o crea una nueva cuando lo necesites.</p>
        </div>
        <Link
          href={`/docente/unidades/${id}/actividades/nueva`}
          className="inline-flex h-11 touch-manipulation items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-sm font-medium text-white transition-[color,background-color,border-color,transform] duration-150 hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 active:scale-[0.97] dark:focus-visible:ring-offset-slate-950"
        >
            <Plus className="size-4" aria-hidden="true" />
            Crear actividad
        </Link>
      </div>

      {!actividades || actividades.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          titulo="Todavía no hay actividades en esta unidad"
          descripcion="Esta unidad todavía no tiene actividades configuradas."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {actividades.map((a) => {
            const tipo = Array.isArray(a.tipos_actividad) ? a.tipos_actividad[0] : a.tipos_actividad;
            const Icono = ICONO_TIPO[tipo?.nombre ?? ""] ?? ListChecks;
            return (
              <Card key={a.id} className="flex flex-col gap-3 px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    <Icono className="size-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900 dark:text-slate-50">{a.orden}. {a.titulo}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">{etiquetaTipo(tipo?.nombre)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Link href={`/docente/unidades/${id}/actividades/${a.id}`} className="inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-400 dark:hover:bg-indigo-950/40">
                      Ver instrucciones
                    </Link>
                    <Link href={`/docente/unidades/${id}/actividades/${a.id}/editar`} aria-label={`Editar ${a.titulo}`} title="Editar actividad" className="inline-flex size-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400">
                      <Pencil className="size-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
                <details className="border-t border-slate-100 pt-3 dark:border-slate-800">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400">
                    <Video className="size-4" aria-hidden="true" />
                    {a.video_url ? "Editar video de apoyo" : "Añadir video de apoyo"}
                  </summary>
                  <div className="pt-3">
                    <ActividadVideoEditor actividadId={a.id} unidadId={id} videoUrlInicial={a.video_url} />
                  </div>
                </details>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
