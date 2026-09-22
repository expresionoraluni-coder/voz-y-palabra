import "server-only";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { ETIQUETAS_CATEGORIA, PRIORIDADES_REPORTE } from "@/lib/reportes-constantes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VENTANA_AVISO_MS = 15 * 60 * 1000;

type ReporteParaAviso = {
  id: string;
  reportante_id: string;
  reportante_tipo: "estudiante" | "docente";
  categoria: string;
  prioridad: string;
  created_at: string;
};

function textoSeguro(valor: string) {
  return valor.replace(/[&<>'"]/g, (caracter) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[caracter] ?? caracter);
}

function configGmail() {
  const usuario = process.env.GMAIL_SMTP_USER?.trim();
  const contrasena = process.env.GMAIL_SMTP_APP_PASSWORD?.replace(/\s/g, "");
  if (!usuario || !contrasena) return null;
  return { usuario, contrasena };
}

function esReporteReciente(creadoEn: string) {
  const marca = Date.parse(creadoEn);
  if (!Number.isFinite(marca)) return false;
  const antiguedad = Date.now() - marca;
  return antiguedad >= -60_000 && antiguedad <= VENTANA_AVISO_MS;
}

async function destinatariosAdministradores() {
  const admin = createAdminClient();
  const { data: administradores, error } = await admin
    .from("administradores")
    .select("id")
    .eq("activo", true)
    .limit(10);
  if (error || !administradores?.length) return [];

  const usuarios = await Promise.all(
    administradores.map(({ id }) => admin.auth.admin.getUserById(id)),
  );
  return [...new Set(
    usuarios.flatMap(({ data, error: usuarioError }) => {
      const correo = data.user?.email?.trim().toLowerCase();
      return !usuarioError && correo && data.user?.email_confirmed_at ? [correo] : [];
    }),
  )];
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

  const gmail = configGmail();
  if (!gmail) {
    console.warn("Avisos de reportes sin configuración de Gmail.");
    return new NextResponse(null, { status: 204 });
  }

  const destinatarios = await destinatariosAdministradores();
  if (!destinatarios.length) {
    console.error("No hay una cuenta administradora confirmada para recibir avisos de reportes.");
    return NextResponse.json({ error: "No pudimos enviar el aviso." }, { status: 503 });
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

  const folio = reporte.id.slice(0, 8).toUpperCase();
  const categoria = ETIQUETAS_CATEGORIA[reporte.categoria] ?? reporte.categoria;
  const prioridad = PRIORIDADES_REPORTE[reporte.prioridad] ?? reporte.prioridad;
  const tipo = reporte.reportante_tipo === "estudiante" ? "Estudiante" : "Docente";
  const enlace = new URL("/admin/reportes", request.url).toString();
  const texto = [
    "Se registró un nuevo reporte en Voz y Palabra.",
    `Folio: ${folio}`,
    `Reporta: ${tipo}`,
    `Categoría: ${categoria}`,
    `Prioridad: ${prioridad}`,
    `Revísalo en: ${enlace}`,
  ].join("\n");

  try {
    const transportador = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: gmail.usuario, pass: gmail.contrasena },
    });
    await transportador.sendMail({
      from: `Voz y Palabra <${gmail.usuario}>`,
      to: destinatarios,
      subject: `[Voz y Palabra] Reporte ${folio} · ${prioridad}`,
      text: texto,
      html: `<p>Se registró un nuevo reporte en <strong>Voz y Palabra</strong>.</p><ul><li><strong>Folio:</strong> ${textoSeguro(folio)}</li><li><strong>Reporta:</strong> ${textoSeguro(tipo)}</li><li><strong>Categoría:</strong> ${textoSeguro(categoria)}</li><li><strong>Prioridad:</strong> ${textoSeguro(prioridad)}</li></ul><p><a href="${textoSeguro(enlace)}">Abrir bandeja de reportes</a></p>`,
    });
    await finalizarAviso(reporte.id, true);
    return new NextResponse(null, { status: 204 });
  } catch {
    await finalizarAviso(reporte.id, false);
    console.error("No se pudo enviar el aviso de reporte por Gmail.", { reporteId: reporte.id });
    return NextResponse.json({ error: "No pudimos enviar el aviso." }, { status: 502 });
  }
}
