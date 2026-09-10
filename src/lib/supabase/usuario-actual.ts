import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Comparte la validación de Auth entre layout y página durante el mismo render. */
export const obtenerUsuarioActual = cache(async () => {
  const supabase = await createClient();
  return supabase.auth.getUser();
});
