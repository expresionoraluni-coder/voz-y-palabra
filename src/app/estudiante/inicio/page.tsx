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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center dark:bg-black">
      <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
        Hola, {estudiante.nombre}
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Grupo: {grupo?.nombre ?? "—"}
      </p>
      <p className="text-sm text-zinc-500 dark:text-zinc-500">
        Aquí va a vivir tu ruta de unidades y actividades (Fase 5 en adelante).
      </p>
      <CerrarSesion />
    </div>
  );
}
