import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CerrarSesion from "@/components/cerrar-sesion";

export default async function DashboardDocente() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/ingreso/profesora");

  const { data: docente } = await supabase
    .from("docentes")
    .select("nombre")
    .eq("id", user.id)
    .single();

  if (!docente) redirect("/ingreso/profesora");

  const { data: grupos } = await supabase
    .from("grupos")
    .select("id, nombre, codigo_acceso, estudiantes(count)")
    .order("created_at", { ascending: false });

  const { data: unidades } = await supabase
    .from("unidades")
    .select("nombre, orden, reto_comunicativo")
    .order("orden");

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 bg-white px-6 py-10 dark:bg-black">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Hola, {docente.nombre}
        </h1>
        <CerrarSesion />
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            Tus grupos
          </h2>
          <Link
            href="/docente/grupos/nuevo"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
          >
            Crear grupo
          </Link>
        </div>
        {!grupos || grupos.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            Todavía no tienes grupos. Crea el primero para generar su código de acceso.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {grupos.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/docente/grupos/${g.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {g.nombre}
                  </span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-500">
                    código: {g.codigo_acceso} ·{" "}
                    {Array.isArray(g.estudiantes) ? g.estudiantes[0]?.count ?? 0 : 0}{" "}
                    estudiantes
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Unidades del curso
        </h2>
        <ul className="flex flex-col gap-2">
          {unidades?.map((u) => (
            <li
              key={u.nombre}
              className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
            >
              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                Unidad {u.orden}. {u.nombre}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-500">
                Reto: {u.reto_comunicativo}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
