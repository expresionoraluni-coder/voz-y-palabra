import "server-only";
import { NextResponse } from "next/server";
import { enviarAvisoCorreoAdministradores, type ReporteParaAvisoCorreo } from "@/lib/reportes/notificaciones-correo";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VENTANA_AVISO_MS = 15 * 60 * 1000;

type ReporteParaAviso = ReporteParaAvisoCorreo & {
  id: string;
  reportante_id: string;
  created_at: string;
};

function esReporteReciente(creadoEn: string) {
  const marca = Date.parse(creadoEn);
  if (!Number.isFinite(marca)) return false;
  const antiguedad = Date.now() - marca;
  return antiguedad >= -60_000 && antiguedad <= VENTANA_AVISO_MS;
}

async function finalizarAviso(reporteId: string, enviado: boolean) {
  const { error } = await createAdminClient().rpc("finalizar_notificacion_correo_reporte", {
    p_reporte_id: reporteId,
    p_enviada: enviado,
  });
  if (error) {
    console.error("No se pudo registrar el resultado del aviso de reporte.", { reporteId });
  }
}

export async function POST(request: Request) {
  let reporteId: unknown;
  try {
    ({ reporteId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  if (typeof reporteId !== "string" || !UUID.test(reporteId)) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  // La identidad no se toma del cuerpo de la petición. getClaims verifica la
  // firma del JWT de las cookies antes de consultar el reporte con sus RLS.
  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const actorId = claims?.claims?.sub;
  if (claimsError || typeof actorId !== "string") {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }

  const { data, error: reporteError } = await supabase
    .from("reportes")
    .select("id, reportante_id, reportante_tipo, categoria, prioridad, created_at")
    .eq("id", reporteId)
    .maybeSingle();
  const reporte = data as ReporteParaAviso | null;
  if (reporteError || !reporte || reporte.reportante_id !== actorId || !esReporteReciente(reporte.created_at)) {
    return NextResponse.json({ error: "Reporte no disponible." }, { status: 404 });
  }

  // Esta reclamación se resuelve atómicamente en Supabase. Solo service_role
  // puede ejecutarla; ni el navegador ni una sesión de estudiante pueden
  // marcar correos como enviados o repetir un aviso ya finalizado.
  const admin = createAdminClient();
  const { data: reclamado, error: reclamacionError } = await admin.rpc("reclamar_notificacion_correo_reporte", {
    p_reporte_id: reporte.id,
  });
  if (reclamacionError) {
    console.error("No se pudo reclamar el aviso de reporte.", { reporteId: reporte.id });
    return NextResponse.json({ error: "No pudimos enviar el aviso." }, { status: 503 });
  }
  if (!reclamado) return new NextResponse(null, { status: 204 });

  const resultadoEnvio = await enviarAvisoCorreoAdministradores({
    baseUrl: request.url,
    reporte,
    tipoAviso: "reporte_nuevo",
  });
  if (resultadoEnvio === "enviado") {
    await finalizarAviso(reporte.id, true);
    return new NextResponse(null, { status: 204 });
  }
  if (resultadoEnvio === "sin_configuracion") console.warn("Avisos de reportes sin configuración de Gmail.");
  if (resultadoEnvio === "sin_destinatario") console.error("No hay una cuenta administradora confirmada para recibir avisos de reportes.");
  await finalizarAviso(reporte.id, false);
  console.error("No se pudo enviar el aviso de reporte por Gmail.", { reporteId: reporte.id, motivo: resultadoEnvio });
  return NextResponse.json({ error: "No pudimos enviar el aviso." }, { status: resultadoEnvio === "sin_destinatario" ? 503 : 502 });
}
