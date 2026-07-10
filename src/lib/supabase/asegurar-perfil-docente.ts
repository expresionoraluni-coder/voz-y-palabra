import { SupabaseClient, User } from "@supabase/supabase-js";

export async function asegurarPerfilDocente(supabase: SupabaseClient, user: User) {
  const { data: existente } = await supabase
    .from("docentes")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existente) return { error: null };

  const nombre = (user.user_metadata?.nombre as string | undefined) ?? user.email ?? "Profesora";

  const { error } = await supabase
    .from("docentes")
    .insert({ id: user.id, nombre, correo: user.email });

  return { error };
}
