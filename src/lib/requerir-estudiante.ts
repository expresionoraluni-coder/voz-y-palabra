import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * El patrón "sin sesión o sin fila en estudiantes → /ingreso/estudiante" se
 * repetía en 5 páginas del hub. No se usa en actividad/[id] ni unidad/[id]:
 * esas dos ya combinan la búsqueda del estudiante con otras consultas
 * independientes en un solo Promise.all, y envolverlas aquí las volvería
 * secuenciales de nuevo.
 *
 * La lectura se hace del lado del servidor con el cliente administrativo,
 * pero siempre se amarra explícitamente al id de la sesión y a una fila
 * activa. Así la sesión anónima del estudiante no necesita permisos de
 * lectura sobre la tabla y no se abre la RLS para resolver una carga.
 */
export async function requireEstudiante<T extends { id: string } = { id: string }>(
  supabase: SupabaseClient,
  select = "id",
  opciones: { permitirCambioNip?: boolean } = {},
): Promise<T & { debe_cambiar_nip: boolean }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous !== true) redirect("/ingreso/estudiante");

  const seleccion = /(^|,)\s*debe_cambiar_nip(?:\s|,|$)/.test(select)
    ? select
    : `${select}, debe_cambiar_nip`;
  const { data: estudiante, error } = await createAdminClient()
    .from("estudiantes")
    .select(seleccion)
    .eq("auth_user_id", user.id)
    .eq("activo", true)
    .single();

  // PGRST116 significa que la sesión no tiene una fila de estudiante; los
  // demás errores son fallos reales de carga y deben llegar al error boundary
  // en lugar de parecer un cierre de sesión.
  if (error && error.code !== "PGRST116") {
    throw new Error("No pudimos cargar tu sesión de estudiante. Intenta de nuevo.");
  }

  if (!estudiante) redirect("/ingreso/estudiante");
  const estudianteConEstado = estudiante as unknown as T & { debe_cambiar_nip: boolean };
  if (estudianteConEstado.debe_cambiar_nip && !opciones.permitirCambioNip) {
    redirect("/estudiante/inicio?cambiar-nip=1");
  }
  return estudianteConEstado;
}
