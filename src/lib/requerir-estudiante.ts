import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * El patrón "sin sesión o sin fila en estudiantes → /ingreso/estudiante" se
 * repetía en 5 páginas del hub. No se usa en actividad/[id] ni unidad/[id]:
 * esas dos ya combinan la búsqueda del estudiante con otras consultas
 * independientes en un solo Promise.all, y envolverlas aquí las volvería
 * secuenciales de nuevo.
 *
 * No hace falta llamar a auth.getUser() antes de buscar la fila: la
 * política RLS de "estudiantes" ya solo deja ver la fila cuyo
 * auth_user_id = auth.uid() (columna con unique constraint, así que nunca
 * hay más de una), así que sin sesión — o con sesión de otro tipo, p. ej.
 * una docente — esta única consulta ya vuelve vacía sola. Antes eran 2
 * viajes de ida y vuelta seguidos en cada una de las 5 páginas del hub;
 * ahora es 1.
 */
export async function requireEstudiante<T extends { id: string } = { id: string }>(
  supabase: SupabaseClient,
  select = "id",
): Promise<T> {
  const { data: estudiante } = await supabase.from("estudiantes").select(select).single();

  if (!estudiante) redirect("/ingreso/estudiante");
  return estudiante as unknown as T;
}
