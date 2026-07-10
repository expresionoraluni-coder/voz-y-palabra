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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center dark:bg-black">
      <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
        Hola, {docente.nombre}
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-500">
        Aquí va a vivir tu panel de grupos, contenidos y avance (Fase 3 en adelante).
      </p>
      <CerrarSesion />
    </div>
  );
}
