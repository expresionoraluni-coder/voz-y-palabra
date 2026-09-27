import { Award, Brain, Compass, Lightbulb, Lock, Mic, LucideIcon, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireEstudiante } from "@/lib/requerir-estudiante";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";

const ICONO_INSIGNIA: Record<string, LucideIcon> = {
  compass: Compass,
  brain: Brain,
  bulb: Lightbulb,
  award: Award,
  mic: Mic,
  trophy: Trophy,
};

export default async function InsigniasEstudiante() {
  const supabase = await createClient();
  const estudiante = await requireEstudiante(supabase);

  const [{ data: catalogo }, { data: obtenidas }] = await Promise.all([
    supabase.from("insignias").select("id, nombre, descripcion, icono").order("nombre"),
    supabase.from("insignias_otorgadas").select("insignia_id").eq("estudiante_id", estudiante.id),
  ]);

  const idsObtenidas = new Set((obtenidas ?? []).map((o) => o.insignia_id));
  const total = catalogo?.length ?? 0;
  const ganadas = idsObtenidas.size;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <PageHeader
        volverHref="/estudiante/inicio"
        eyebrow={`${ganadas} de ${total} insignias`}
        titulo="Mis insignias"
        descripcion="Se desbloquean solas conforme avanzas: cada una marca un logro real, no solo actividad completada."
      />

      {total > 0 && (
        <Card className="relative overflow-hidden border-amber-200 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 p-5 text-white shadow-xl shadow-amber-500/20 dark:border-amber-700">
          <div aria-hidden="true" className="absolute -right-10 -top-10 size-36 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-sm"><Trophy className="size-7" aria-hidden="true" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-100">Tu colección</p>
              <p className="mt-1 text-xl font-bold">{ganadas} logro{ganadas === 1 ? "" : "s"} desbloqueado{ganadas === 1 ? "" : "s"}</p>
              <p className="mt-1 text-sm text-amber-50">Cada insignia reconoce una habilidad que ya practicaste.</p>
            </div>
          </div>
        </Card>
      )}

      {total === 0 && (
        <EmptyState
          icon={Award}
          titulo="Todavía no hay insignias configuradas"
          descripcion="Cuando el catálogo esté listo, tus logros van a aparecer aquí."
        />
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3" role="list">
        {catalogo?.map((insignia) => {
          const Icono = ICONO_INSIGNIA[insignia.icono ?? ""] ?? Award;
          const obtenida = idsObtenidas.has(insignia.id);
          return (
            <div
              key={insignia.id}
              role="listitem"
              aria-label={`${insignia.nombre}: ${obtenida ? "obtenida" : "pendiente"}`}
              className={`relative flex flex-col items-center gap-3 overflow-hidden rounded-[1.4rem] border p-5 text-center transition-[transform,box-shadow] duration-200 hover:-translate-y-1 ${
                obtenida
                  ? "border-amber-200 bg-gradient-to-b from-amber-50 to-white shadow-sm dark:border-amber-900 dark:from-amber-950/40 dark:to-slate-900"
                  : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40"
              }`}
            >
              <div
                className={`relative flex size-16 shrink-0 items-center justify-center rounded-full ${
                  obtenida
                    ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/30 ring-4 ring-amber-100/70 dark:ring-amber-950/40"
                    : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                <Icono className="size-7" aria-hidden="true" />
                {!obtenida && (
                  <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-slate-400 text-white ring-2 ring-slate-50 dark:bg-slate-600 dark:ring-slate-950">
                    <Lock className="size-3" aria-hidden="true" />
                  </div>
                )}
              </div>
              <div>
                <p
                  className={`text-sm font-semibold ${
                    obtenida ? "text-slate-900 dark:text-slate-50" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {insignia.nombre}
                </p>
                <p className={`mt-1 text-[11px] font-medium uppercase tracking-wide ${
                  obtenida ? "text-amber-700 dark:text-amber-300" : "text-slate-400 dark:text-slate-400"
                }`}>
                  {obtenida ? "Obtenida" : "Pendiente"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {insignia.descripcion}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
