import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  ListTree,
  MessageSquareText,
  ScanSearch,
  Columns3,
  PenLine,
  Tags,
  Workflow,
  Mic,
  ListChecks,
  Plus,
  LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import Boton from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";

const ICONO_TIPO: Record<string, LucideIcon> = {
  opcion_justificacion: MessageSquareText,
  clasificacion: ListTree,
  encontrar_corregir: ScanSearch,
  comparador: Columns3,
  redaccion_checklist: PenLine,
  etiquetado_texto: Tags,
  constructor_ramificado: Workflow,
  grabacion_rubrica: Mic,
};

export default async function DetalleUnidadDocente({
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

  const { data: unidad } = await supabase
    .from("unidades")
    .select("id, nombre, orden, reto_comunicativo")
    .eq("id", id)
    .single();
  if (!unidad) notFound();

  const { data: actividades } = await supabase
    .from("actividades")
    .select("id, titulo, orden, tipos_actividad(nombre)")
    .eq("unidad_id", id)
    .order("orden");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <PageHeader
        volverHref="/docente/dashboard"
        eyebrow={`Unidad ${unidad.orden}`}
        titulo={unidad.nombre}
        descripcion={unidad.reto_comunicativo}
      />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Actividades</h2>
        <Link href={`/docente/unidades/${id}/actividades/nueva`}>
          <Boton size="sm">
            <Plus className="size-4" aria-hidden="true" />
            Crear actividad
          </Boton>
        </Link>
      </div>

      {!actividades || actividades.length === 0 ? (
        <EmptyState icon={ListChecks} titulo="Todavía no hay actividades en esta unidad" />
      ) : (
        <div className="flex flex-col gap-2">
          {actividades.map((a) => {
            const tipo = Array.isArray(a.tipos_actividad) ? a.tipos_actividad[0] : a.tipos_actividad;
            const Icono = ICONO_TIPO[tipo?.nombre ?? ""] ?? ListChecks;
            return (
              <Card key={a.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  <Icono className="size-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-50">{a.titulo}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">{tipo?.nombre}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
