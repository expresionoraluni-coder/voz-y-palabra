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
    .select("id, nombre, grupos(nombre)")
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

  // Revisa y otorga insignias nuevas cada vez que el estudiante visita su inicio.
  const { data: insignias } = await supabase.rpc("verificar_insignias");

  const [{ count: actividadesCompletadas }, { count: totalReflexiones }] =
    await Promise.all([
      supabase
        .from("entregas")
        .select("id", { count: "exact", head: true })
        .eq("estudiante_id", estudiante.id),
      supabase
        .from("reflexiones")
        .select("id", { count: "exact", head: true })
        .eq("estudiante_id", estudiante.id),
    ]);

  const puntos = (actividadesCompletadas ?? 0) * 10 + (totalReflexiones ?? 0) * 5;

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

      <div className="flex items-center gap-4">
        <div className="rounded-lg bg-zinc-100 px-4 py-2 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-500">Puntos</p>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{puntos}</p>
        </div>
        <Link
          href="/estudiante/portafolio"
          className="text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          Ver mi portafolio
        </Link>
      </div>

      {insignias && insignias.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Tus insignias
          </p>
          <div className="flex flex-wrap gap-2">
            {insignias.map((i: { nombre: string; descripcion: string }) => (
              <span
                key={i.nombre}
                title={i.descripcion}
                className="rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
              >
                {i.nombre}
              </span>
            ))}
          </div>
        </div>
      )}

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
