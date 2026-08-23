import { SupabaseClient } from "@supabase/supabase-js";

export async function existePerfilDocente(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.from("docentes").select("id").eq("id", userId).maybeSingle();
  return { existe: !!data, error };
}
