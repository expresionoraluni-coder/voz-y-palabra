import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AgregarEstudiantes from "./agregar-estudiantes";

export default async function DetalleGrupo({
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

  const { data: grupo } = await supabase
    .from("grupos")
    .select("id, nombre, codigo_acceso, ciclo_escolar")
    .eq("id", id)
    .single();

  if (!grupo) notFound();

  const { data: estudiantes } = await supabase
    .from("estudiantes")
    .select("id, nombre, created_at")
    .eq("grupo_id", id)
    .order("nombre");

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 bg-white px-6 py-10 dark:bg-black">
      <div>
        <Link
          href="/docente/dashboard"
          className="text-sm text-zinc-500 underline dark:text-zinc-400"
        >
          ← Volver
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {grupo.nombre}
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Código de acceso:{" "}
          <span className="rounded bg-zinc-100 px-2 py-1 font-mono text-lg font-semibold dark:bg-zinc-900">
            {grupo.codigo_acceso}
          </span>
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
          Comparte este código con tus estudiantes. Ellos lo usan junto con su
          nombre para entrar, sin necesitar correo ni contraseña.
        </p>
      </div>

      <AgregarEstudiantes grupoId={grupo.id} />

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Estudiantes ({estudiantes?.length ?? 0})
        </h2>
        {!estudiantes || estudiantes.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            Todavía no hay estudiantes en este grupo.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {estudiantes.map((e) => (
              <li
                key={e.id}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-zinc-900 dark:border-zinc-800 dark:text-zinc-50"
              >
                {e.nombre}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
