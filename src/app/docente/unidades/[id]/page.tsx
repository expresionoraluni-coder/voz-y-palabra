import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 bg-white px-6 py-10 dark:bg-black">
      <div>
        <Link
          href="/docente/dashboard"
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

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Actividades
        </h2>
        <Link
          href={`/docente/unidades/${id}/actividades/nueva`}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          Crear actividad
        </Link>
      </div>

      {!actividades || actividades.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          Todavía no hay actividades en esta unidad.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {actividades.map((a) => {
            const tipo = Array.isArray(a.tipos_actividad)
              ? a.tipos_actividad[0]
              : a.tipos_actividad;
            return (
              <li
                key={a.id}
                className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
              >
                <p className="font-medium text-zinc-900 dark:text-zinc-50">
                  {a.titulo}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-500">
                  Tipo: {tipo?.nombre}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
