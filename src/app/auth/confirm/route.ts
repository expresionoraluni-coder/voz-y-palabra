import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TIPOS_CONFIRMACION: EmailOtpType[] = ["signup", "email"];

function rutaLocal(valor: string | null) {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//")) {
    return "/ingreso/profesora";
  }
  return valor;
}
function redirigir(request: NextRequest, ruta: string) {
  return NextResponse.redirect(new URL(ruta, request.url));
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = rutaLocal(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return redirigir(request, next);
  }

  if (tokenHash && type && TIPOS_CONFIRMACION.includes(type as EmailOtpType)) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });
    if (!error) return redirigir(request, next);
  }

  return redirigir(request, "/ingreso/profesora?error=confirmacion");
}
