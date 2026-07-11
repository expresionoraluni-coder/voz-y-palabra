import { redirect } from "next/navigation";
import { Award, Brain, Compass, Lightbulb, Lock, Mic, LucideIcon, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/page-header";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingreso/estudiante");

  const { data: estudiante } = await supabase
    .from("estudiantes")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();
  if (!estudiante) redirect("/ingreso/estudiante");

  const [{ data: catalogo }, { data: obtenidas }] = await Promise.all([
    supabase.from("insignias").select("id, nombre, descripcion, icono").order("nombre"),
    supabase.from("insignias_otorgadas").select("insignia_id").eq("estudiante_id", estudiante.id),
  ]);

  const idsObtenidas = new Set((obtenidas ?? []).map((o) => o.insignia_id));
  const total = catalogo?.length ?? 0;
  const ganadas = idsObtenidas.size;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <PageHeader
        volverHref="/estudiante/inicio"
        eyebrow={`${ganadas} de ${total} insignias`}
        titulo="Mis insignias"
        descripcion="Se desbloquean solas conforme avanzas: cada una marca un logro real, no solo actividad completada."
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {catalogo?.map((insignia) => {
          const Icono = ICONO_INSIGNIA[insignia.icono ?? ""] ?? Award;
          const obtenida = idsObtenidas.has(insignia.id);
          return (
            <div
              key={insignia.id}
              className={`flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-shadow ${
                obtenida
                  ? "border-amber-200 bg-gradient-to-b from-amber-50 to-white shadow-sm dark:border-amber-900 dark:from-amber-950/40 dark:to-slate-900"
                  : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40"
              }`}
            >
              <div
                className={`relative flex size-16 shrink-0 items-center justify-center rounded-full ${
                  obtenida
                    ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/30"
                    : "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600"
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
                    obtenida ? "text-slate-900 dark:text-slate-50" : "text-slate-500 dark:text-slate-500"
                  }`}
                >
                  {insignia.nombre}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-500">
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
