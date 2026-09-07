import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { destinoConfirmacionSeguro } from "@/lib/auth-url";
import { createClient } from "@/lib/supabase/server";

const TIPOS_CONFIRMACION: EmailOtpType[] = ["signup", "email"];

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = destinoConfirmacionSeguro(url.searchParams.get("next"), url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(next);
  }

  if (tokenHash && type && TIPOS_CONFIRMACION.includes(type as EmailOtpType)) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(next);
  }

  return NextResponse.redirect(
    destinoConfirmacionSeguro(null, url, "/ingreso/profesora?error=confirmacion"),
  );
}
