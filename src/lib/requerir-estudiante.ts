import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * El patrón "sin sesión o sin fila en estudiantes → /ingreso/estudiante" se
 * repetía en 5 páginas del hub. No se usa en actividad/[id] ni unidad/[id]:
 * esas dos ya combinan la búsqueda del estudiante con otras consultas
 * independientes en un solo Promise.all, y envolverlas aquí las volvería
 * secuenciales de nuevo.
 */
export async function requireEstudiante<T extends { id: string } = { id: string }>(
  supabase: SupabaseClient,
  select = "id",
): Promise<T> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingreso/estudiante");

  const { data: estudiante } = await supabase
    .from("estudiantes")
    .select(select)
    .eq("auth_user_id", user.id)
    .single();

  if (!estudiante) redirect("/ingreso/estudiante");
  return estudiante as unknown as T;
}
