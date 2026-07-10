import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Confianza from "./confianza";

export default async function UnidadEstudiante({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data: unidad } = await supabase
    .from("unidades")
    .select("id, nombre, orden, reto_comunicativo")
    .eq("id", id)
    .single();
  if (!unidad) notFound();

  const { data: actividades } = await supabase
    .from("actividades")
    .select("id, titulo, instrucciones, entregas(id)")
    .eq("unidad_id", id)
    .order("orden");

  const { data: confianzas } = await supabase
    .from("autoevaluaciones_confianza")
    .select("momento, valor")
    .eq("estudiante_id", estudiante.id)
    .eq("unidad_id", id);

  const confianzaInicio = confianzas?.find((c) => c.momento === "inicio");
  const confianzaCierre = confianzas?.find((c) => c.momento === "cierre");

  const totalActividades = actividades?.length ?? 0;
  const completadas =
    actividades?.filter((a) => Array.isArray(a.entregas) && a.entregas.length > 0)
      .length ?? 0;
  const unidadCompleta = totalActividades > 0 && completadas === totalActividades;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 bg-white px-6 py-10 dark:bg-black">
      <div>
        <Link
          href="/estudiante/inicio"
          className="text-sm text-zinc-500 underline dark:text-zinc-400"
        >
          ← Volver
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Unidad {unidad.orden}. {unidad.nombre}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
          Reto: {unidad.reto_comunicativo}
        </p>
      </div>

      {!confianzaInicio && (
        <Confianza estudianteId={estudiante.id} unidadId={id} momento="inicio" />
      )}

      {!actividades || actividades.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          Todavía no hay actividades publicadas en esta unidad.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {actividades.map((a) => {
            const completada = Array.isArray(a.entregas) && a.entregas.length > 0;
            return (
              <li key={a.id}>
                <Link
                  href={`/estudiante/actividad/${a.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {a.titulo}
                  </span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-500">
                    {completada ? "✓ Completada" : "Sin empezar"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {unidadCompleta && !confianzaCierre && (
        <Confianza estudianteId={estudiante.id} unidadId={id} momento="cierre" />
      )}

      {confianzaInicio && confianzaCierre && (
        <p className="rounded-lg bg-zinc-100 px-4 py-3 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          Tu confianza pasó de {confianzaInicio.valor}% a {confianzaCierre.valor}% en
          esta unidad.
        </p>
      )}
    </div>
  );
}
