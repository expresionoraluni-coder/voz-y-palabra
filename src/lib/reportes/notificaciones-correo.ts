import "server-only";

import nodemailer from "nodemailer";
import { ETIQUETAS_CATEGORIA, PRIORIDADES_REPORTE } from "@/lib/reportes-constantes";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReporteParaAvisoCorreo = {
  id: string;
  reportante_tipo: "estudiante" | "docente";
  categoria: string;
  prioridad: string;
};

type TipoAviso = "reporte_nuevo" | "respuesta_reportante";

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

/**
 * Envía únicamente datos operativos mínimos: nunca el mensaje ni la
 * descripción del reporte. Así el correo avisa sin trasladar datos del
 * estudiante o docente fuera de la plataforma.
 */
export async function enviarAvisoCorreoAdministradores({
  baseUrl,
  reporte,
  tipoAviso,
}: {
  baseUrl: string;
  reporte: ReporteParaAvisoCorreo;
  tipoAviso: TipoAviso;
}): Promise<"enviado" | "sin_configuracion" | "sin_destinatario" | "fallo"> {
  const gmail = configGmail();
  if (!gmail) return "sin_configuracion";

  const destinatarios = await destinatariosAdministradores();
  if (!destinatarios.length) return "sin_destinatario";

  const folio = reporte.id.slice(0, 8).toUpperCase();
  const categoria = ETIQUETAS_CATEGORIA[reporte.categoria] ?? reporte.categoria;
  const prioridad = PRIORIDADES_REPORTE[reporte.prioridad] ?? reporte.prioridad;
  const reportante = reporte.reportante_tipo === "estudiante" ? "Estudiante" : "Docente";
  const enlace = new URL("/admin/reportes", baseUrl).toString();
  const encabezado = tipoAviso === "reporte_nuevo"
    ? "Se registró un nuevo reporte en Voz y Palabra."
    : "Hay información nueva en un reporte de Voz y Palabra.";
  const asunto = tipoAviso === "reporte_nuevo"
    ? `[Voz y Palabra] Reporte ${folio} · ${prioridad}`
    : `[Voz y Palabra] Respuesta en reporte ${folio}`;
  const texto = [
    encabezado,
    `Folio: ${folio}`,
    `Reporta: ${reportante}`,
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
      subject: asunto,
      text: texto,
      html: `<p>${textoSeguro(encabezado)}</p><ul><li><strong>Folio:</strong> ${textoSeguro(folio)}</li><li><strong>Reporta:</strong> ${textoSeguro(reportante)}</li><li><strong>Categoría:</strong> ${textoSeguro(categoria)}</li><li><strong>Prioridad:</strong> ${textoSeguro(prioridad)}</li></ul><p><a href="${textoSeguro(enlace)}">Abrir bandeja de reportes</a></p>`,
    });
    return "enviado";
  } catch {
    return "fallo";
  }
}
