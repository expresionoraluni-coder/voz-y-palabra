import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { revisarErrorConsulta } from "@/lib/revisar-error-consulta";

/** Devuelve la primera unidad anterior cuyo cierre fue retirado o aún no se guardó. */
export async function primeraUnidadSinReflexionDeCierre(
  admin: ReturnType<typeof createAdminClient>,
  estudianteId: string,
  ordenActual: number,
): Promise<{ id: string; orden: number } | null> {
  if (ordenActual <= 1) return null;

  const { data: anteriores, error: unidadesError } = await admin
    .from("unidades")
    .select("id, orden")
    .lt("orden", ordenActual)
    .order("orden");
  revisarErrorConsulta(unidadesError, "No pudimos comprobar los cierres anteriores.");
  if (!anteriores?.length) return null;

  const { data: cierres, error: cierresError } = await admin
    .from("reflexiones")
    .select("unidad_id")
    .eq("estudiante_id", estudianteId)
    .eq("momento", "cierre")
    .is("actividad_id", null)
    .in("unidad_id", anteriores.map((unidad) => unidad.id));
  revisarErrorConsulta(cierresError, "No pudimos comprobar tus reflexiones de cierre.");

  const unidadesCerradas = new Set((cierres ?? []).map((cierre) => cierre.unidad_id));
  return anteriores.find((unidad) => !unidadesCerradas.has(unidad.id)) ?? null;
}
