import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Bypassa RLS por completo (service role). Solo se debe llamar desde dentro
// de una Server Action que ya resolvió la sesión real y validó/recalculó
// todo del lado del servidor (ver contextoCalificacion en
// acciones-calificacion.ts) — nunca para leer o escribir a partir de un id
// que mande el cliente sin validar antes. `import "server-only"` hace que
// el build truene si esto llegara a importarse desde un Client Component,
// en vez de fallar en silencio filtrando la key al bundle.
// Sin genérico explícito, @supabase/supabase-js infiere `never` para las
// columnas de insert/upsert al no haber tipos de Database generados en este
// proyecto (mismo estado que el resto del código, que usa @supabase/ssr sin
// ese problema por cómo tipa su default) — <any> evita el falso error sin
// fingir una seguridad de tipos que hoy no existe en ningún otro cliente.
let cliente: ReturnType<typeof createSupabaseClient<any>> | undefined;

export function createAdminClient() {
  if (!cliente) {
    cliente = createSupabaseClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
  return cliente;
}
