import { LineChart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireEstudiante } from "@/lib/requerir-estudiante";
import PageHeader from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import ProgressBar from "@/components/ui/progress-bar";
import EmptyState from "@/components/ui/empty-state";

export default async function ProgresoEstudiante() {
  const supabase = await createClient();
  const estudiante = await requireEstudiante(supabase);

  const { data: entregas } = await supabase
    .from("entregas")
    .select("puntaje_auto, respuesta, actividades(tipos_actividad(nombre))")
    .eq("estudiante_id", estudiante.id);

  const precisionPorTipo = Object.values(
    (entregas ?? [])
      .filter((en) => en.puntaje_auto !== null)
      .reduce(
        (acc, en) => {
          const act = Array.isArray(en.actividades) ? en.actividades[0] : en.actividades;
          const tipo = act
            ? Array.isArray(act.tipos_actividad)
              ? act.tipos_actividad[0]
              : act.tipos_actividad
            : undefined;
          const nombre = tipo?.nombre ?? "otro";
          acc[nombre] ??= { nombre, suma: 0, total: 0 };
          acc[nombre].suma += en.puntaje_auto ?? 0;
          acc[nombre].total += 1;
          return acc;
        },
        {} as Record<string, { nombre: string; suma: number; total: number }>,
      ),
  )
    .map((x) => ({ nombre: x.nombre, promedio: Math.round(x.suma / x.total), n: x.total }))
    .sort((a, b) => a.promedio - b.promedio);

  const analisisTexto = (entregas ?? [])
    .map((en) => (en.respuesta as { analisisTexto?: { variedadLexica: number } } | null)?.analisisTexto)
    .filter((a): a is { variedadLexica: number } => !!a && typeof a.variedadLexica === "number");
  const variedadLexicaPromedio =
    analisisTexto.length > 0
      ? Math.round(analisisTexto.reduce((s, a) => s + a.variedadLexica, 0) / analisisTexto.length)
      : null;

  const sinDatos = precisionPorTipo.length === 0 && variedadLexicaPromedio === null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-6 px-6 py-10">
      <PageHeader
        volverHref="/estudiante/inicio"
        titulo="Mi progreso"
        descripcion="El mismo dato que ve tu profesora, pero sobre ti — solo tú lo ves."
      />

      {sinDatos ? (
        <EmptyState
          icon={LineChart}
          titulo="Todavía no hay suficientes entregas"
          descripcion="Cuando completes algunas actividades, vas a ver aquí en qué tipo de ejercicio te conviene practicar más."
        />
      ) : (
        <>
          {precisionPorTipo.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-slate-900 dark:text-slate-50">
                Precisión por tipo de actividad
              </h2>
              <Card className="flex flex-col gap-4 p-5">
                {precisionPorTipo.map((t) => (
                  <div key={t.nombre}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="capitalize text-slate-700 dark:text-slate-300">
                        {t.nombre.replaceAll("_", " ")}
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-50">
                        {t.promedio}% · {t.n} {t.n === 1 ? "entrega" : "entregas"}
                      </span>
                    </div>
                    <ProgressBar
                      porcentaje={t.promedio}
                      gradiente={
                        t.promedio >= 70
                          ? "from-emerald-500 to-emerald-600"
                          : t.promedio >= 40
                            ? "from-amber-500 to-amber-600"
                            : "from-red-500 to-red-600"
                      }
                    />
                  </div>
                ))}
              </Card>
            </section>
          )}

          {variedadLexicaPromedio !== null && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-slate-900 dark:text-slate-50">
                Redacción
              </h2>
              <Card className="p-5">
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">Variedad léxica promedio</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50">
                    {variedadLexicaPromedio}%
                  </span>
                </div>
                <ProgressBar
                  porcentaje={variedadLexicaPromedio}
                  gradiente={variedadLexicaPromedio >= 60 ? "from-emerald-500 to-emerald-600" : "from-amber-500 to-amber-600"}
                />
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}
