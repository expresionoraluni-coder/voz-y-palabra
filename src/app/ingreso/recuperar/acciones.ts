"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { origenAplicacionDesdeEncabezados } from "@/lib/auth-url";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { esContrasenaValida } from "@/lib/validar-contrasena";

function huella(valor: string) {
  return createHash("sha256").update(valor).digest("hex");
}

function fuenteSolicitud(encabezados: Headers) {
  return (
    encabezados.get("x-nf-client-connection-ip") ??
    encabezados.get("cf-connecting-ip") ??
    encabezados.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    encabezados.get("x-real-ip") ??
    "sin-ip"
  );
}

function sesionEsDeRecuperacion(accessToken: string | undefined) {
  if (!accessToken) return false;
  try {
    const parte = accessToken.split(".")[1];
    if (!parte) return false;
    const claims = JSON.parse(Buffer.from(parte, "base64url").toString("utf8")) as {
      amr?: Array<{ method?: string } | string>;
    };
    return (claims.amr ?? []).some((metodo) =>
      typeof metodo === "string" ? metodo === "recovery" : metodo?.method === "recovery",
    );
  } catch {
    return false;
  }
}

export async function solicitarRecuperacion(correo: string): Promise<{ ok: true } | { ok: false; limitado?: boolean }> {
  const correoNormalizado = correo.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoNormalizado) || correoNormalizado.length > 320) {
    return { ok: false };
  }

  const encabezados = await headers();
  const origen = origenAplicacionDesdeEncabezados(encabezados);
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
  const [{ data: usuario }, { data: sesion }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);
  if (!usuario.user || !sesionEsDeRecuperacion(sesion.session?.access_token)) {
    return { ok: false, error: "El enlace ya venció o no es válido. Solicita uno nuevo." };
  }

  const { error } = await supabase.auth.updateUser({ password: contrasena });
  return error
    ? { ok: false, error: "No pudimos actualizar la contraseña. Solicita un enlace nuevo e inténtalo otra vez." }
    : { ok: true };
}
