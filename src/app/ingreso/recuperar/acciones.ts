"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { esContrasenaValida } from "@/lib/validar-contrasena";

function huella(valor: string) {
  return createHash("sha256").update(valor).digest("hex");
}

function normalizarOrigen(valor: string | null | undefined) {
  if (!valor) return null;
  try {
    const url = new URL(valor);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

function origenesPermitidos() {
  return new Set(
    [
      "https://voz-y-palabra.netlify.app",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      process.env.NEXT_PUBLIC_SITE_URL,
    ]
      .map(normalizarOrigen)
      .filter((origen): origen is string => Boolean(origen)),
  );
}

function origenSolicitud(encabezados: Headers) {
  const permitidos = origenesPermitidos();
  const origen = normalizarOrigen(encabezados.get("origin"));
  if (origen && permitidos.has(origen)) return origen;
  const host = encabezados.get("host");
  if (!host) return null;
  const protocolo = encabezados.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const origenDerivado = normalizarOrigen(`${protocolo}://${host}`);
  return origenDerivado && permitidos.has(origenDerivado) ? origenDerivado : null;
}

function fuenteSolicitud(encabezados: Headers) {
  return (
    encabezados.get("x-nf-client-connection-ip") ??
    encabezados.get("cf-connecting-ip") ??
    "sin-ip"
  );
}

export async function solicitarRecuperacion(correo: string): Promise<{ ok: true } | { ok: false; limitado?: boolean }> {
  const correoNormalizado = correo.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoNormalizado) || correoNormalizado.length > 320) {
    return { ok: false };
  }

  const encabezados = await headers();
  const origen = origenSolicitud(encabezados);
  if (!origen) return { ok: false };

  const admin = createAdminClient();
  const huellas = [
    { clave: `correo:${huella(correoNormalizado)}`, limite: 3 },
    { clave: `fuente:${huella(fuenteSolicitud(encabezados))}`, limite: 20 },
  ];
  for (const limite of huellas) {
    const { data, error } = await admin.rpc("controlar_rate_limit_recuperacion", {
      p_clave: limite.clave,
      p_limite: limite.limite,
      p_ventana_minutos: 15,
    });
    if (error || data !== true) return { ok: false, limitado: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(correoNormalizado, {
    redirectTo: `${origen}/ingreso/recuperar/actualizar`,
  });
  return error ? { ok: false } : { ok: true };
}

export async function actualizarContrasenaNueva(
  contrasena: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!esContrasenaValida(contrasena)) {
    return { ok: false, error: "Tu contraseña todavía no cumple todos los requisitos." };
  }

  const supabase = await createClient();
  const { data: usuario } = await supabase.auth.getUser();
  if (!usuario.user) {
    return { ok: false, error: "El enlace ya venció o no es válido. Solicita uno nuevo." };
  }

  const { error } = await supabase.auth.updateUser({ password: contrasena });
  return error
    ? { ok: false, error: "No pudimos actualizar la contraseña. Solicita un enlace nuevo e inténtalo otra vez." }
    : { ok: true };
}
