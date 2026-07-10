import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CerrarSesion from "@/components/cerrar-sesion";

export default async function InicioEstudiante() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/ingreso/estudiante");

  const { data: estudiante } = await supabase
    .from("estudiantes")
    .select("nombre, grupos(nombre)")
    .eq("auth_user_id", user.id)
    .single();

  if (!estudiante) redirect("/ingreso/estudiante");

  const grupo = Array.isArray(estudiante.grupos)
    ? estudiante.grupos[0]
    : estudiante.grupos;

  const { data: unidades } = await supabase
    .from("unidades")
    .select("id, nombre, orden, reto_comunicativo")
    .order("orden");

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 bg-white px-6 py-10 dark:bg-black">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Hola, {estudiante.nombre}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            Grupo: {grupo?.nombre ?? "—"}
          </p>
        </div>
        <CerrarSesion />
      </div>

      <ul className="flex flex-col gap-2">
        {unidades?.map((u) => (
          <li key={u.id}>
            <Link
              href={`/estudiante/unidad/${u.id}`}
              className="block rounded-lg border border-zinc-200 px-4 py-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                Unidad {u.orden}. {u.nombre}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-500">
                Reto: {u.reto_comunicativo}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
