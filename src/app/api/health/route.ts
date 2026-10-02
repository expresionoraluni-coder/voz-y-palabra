import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Endpoint mínimo para monitores de disponibilidad. No devuelve datos de la
 * aplicación: solo confirma que la configuración esencial existe y que la
 * base responde a una consulta sin filas sensibles.
 */
export async function GET() {
  const inicio = performance.now();
  const configuracionCompleta = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  if (!configuracionCompleta) {
    return NextResponse.json(
      { status: "degraded", checks: { configuration: "failed", database: "skipped" } },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  try {
    const { error } = await createAdminClient()
      .from("configuracion_plataforma")
      .select("clave")
      .limit(1);

    if (error) throw error;

    return NextResponse.json(
      {
        status: "ok",
        checks: {
          configuration: "ok",
          database: "ok",
        },
        latency_ms: Math.round(performance.now() - inicio),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // No se expone el mensaje de Supabase: podría contener nombres de tablas,
    // URLs internas o detalles del proveedor.
    return NextResponse.json(
      { status: "degraded", checks: { configuration: "ok", database: "failed" } },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
