import "server-only";

import { NextResponse } from "next/server";
import { enviarAvisoCorreoAdministradores, type ReporteParaAvisoCorreo } from "@/lib/reportes/notificaciones-correo";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VENTANA_AVISO_MS = 24 * 60 * 60 * 1000;

type MensajeParaAviso = {
  id: string;
  reporte_id: string;
  autor_id: string;
  autor_tipo: "reportante" | "administrador";
  creado_en: string;
};

type ReportePropioParaAviso = ReporteParaAvisoCorreo & {
  reportante_id: string;
};

function esMensajeReciente(creadoEn: string) {
  const marca = Date.parse(creadoEn);
  if (!Number.isFinite(marca)) return false;
  const antiguedad = Date.now() - marca;
  return antiguedad >= -60_000 && antiguedad <= VENTANA_AVISO_MS;
}

async function finalizarAviso(mensajeId: string, enviado: boolean) {
  const { error } = await createAdminClient().rpc("finalizar_notificacion_correo_mensaje_reporte", {
    p_mensaje_id: mensajeId,
    p_enviada: enviado,
  });
  if (error) console.error("No se pudo registrar el resultado del aviso de respuesta.", { mensajeId });
}

export async function POST(request: Request) {
  let mensajeId: unknown;
  try {
    ({ mensajeId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  if (typeof mensajeId !== "string" || !UUID.test(mensajeId)) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const actorId = claims?.claims?.sub;
  if (claimsError || typeof actorId !== "string") {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }

  const { data: mensajeData, error: mensajeError } = await supabase
    .from("reporte_mensajes")
    .select("id, reporte_id, autor_id, autor_tipo, creado_en")
    .eq("id", mensajeId)
    .maybeSingle();
  const mensaje = mensajeData as MensajeParaAviso | null;
  if (mensajeError || !mensaje || mensaje.autor_id !== actorId || mensaje.autor_tipo !== "reportante" || !esMensajeReciente(mensaje.creado_en)) {
    return NextResponse.json({ error: "Mensaje no disponible." }, { status: 404 });
  }

  const { data: reporteData, error: reporteError } = await supabase
    .from("reportes")
    .select("id, reportante_id, reportante_tipo, categoria, prioridad")
    .eq("id", mensaje.reporte_id)
    .maybeSingle();
  const reporte = reporteData as ReportePropioParaAviso | null;
  if (reporteError || !reporte || reporte.reportante_id !== actorId) {
    return NextResponse.json({ error: "Reporte no disponible." }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: reclamado, error: reclamacionError } = await admin.rpc("reclamar_notificacion_correo_mensaje_reporte", {
    p_mensaje_id: mensaje.id,
  });
  if (reclamacionError) {
    console.error("No se pudo reclamar el aviso de respuesta.", { mensajeId: mensaje.id });
    return NextResponse.json({ error: "No pudimos enviar el aviso." }, { status: 503 });
  }
  if (!reclamado) return new NextResponse(null, { status: 204 });

  const resultadoEnvio = await enviarAvisoCorreoAdministradores({
    baseUrl: request.url,
    reporte,
    tipoAviso: "respuesta_reportante",
  });
  if (resultadoEnvio === "enviado") {
    await finalizarAviso(mensaje.id, true);
    return new NextResponse(null, { status: 204 });
  }
  if (resultadoEnvio === "sin_configuracion") console.warn("Avisos de respuestas sin configuración de Gmail.");
  if (resultadoEnvio === "sin_destinatario") console.error("No hay una cuenta administradora confirmada para recibir avisos de respuestas.");
  await finalizarAviso(mensaje.id, false);
  console.error("No se pudo enviar el aviso de respuesta por Gmail.", { mensajeId: mensaje.id, motivo: resultadoEnvio });
  return NextResponse.json({ error: "No pudimos enviar el aviso." }, { status: resultadoEnvio === "sin_destinatario" ? 503 : 502 });
}
