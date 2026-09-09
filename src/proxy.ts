import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Debe vivir junto a src/app para que Next.js ejecute esta capa en cada ruta.

/**
 * Mantiene sincronizada la sesión de Supabase entre el navegador y los
 * Server Components. Sin esta capa, el cliente puede iniciar sesión, pero
 * una navegación a una pantalla protegida no recibe sus cookies renovadas.
 */
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const scriptSrc = process.env.NODE_ENV === "production"
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`;
  const csp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    "connect-src 'self' https://*.supabase.co",
    "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
  ].join("; ");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const requiereSesion = [
    "/admin",
    "/docente",
    "/estudiante",
    "/ingreso/profesora",
    "/ingreso/admin",
    "/ingreso/recuperar",
  ].some((ruta) => request.nextUrl.pathname.startsWith(ruta));

  if (requiereSesion) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request: { headers: requestHeaders } });
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      },
    );

    // Valida la sesión con Auth y permite que @supabase/ssr renueve las
    // cookies antes de renderizar una pantalla protegida.
    await supabase.auth.getUser();
  }

  // El panel administrativo y los formularios que contienen credenciales no
  // deben quedar en caché del navegador ni de una capa intermedia.
  if (
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/ingreso/estudiante") ||
    request.nextUrl.pathname.startsWith("/ingreso/profesora") ||
    request.nextUrl.pathname.startsWith("/ingreso/admin") ||
    request.nextUrl.pathname.startsWith("/ingreso/recuperar")
  ) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("Pragma", "no-cache");
  }

  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
