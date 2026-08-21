import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Mantiene sincronizada la sesión de Supabase entre el navegador y los
 * Server Components. Sin esta capa, el cliente puede iniciar sesión, pero
 * una navegación a una pantalla protegida no recibe sus cookies renovadas.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getUser() valida la sesión con Auth y permite que @supabase/ssr renueve
  // los tokens antes de renderizar cualquier pantalla protegida.
  await supabase.auth.getUser();

  // El panel administrativo y los formularios que contienen credenciales no
  // deben quedar en caché del navegador ni de una capa intermedia.
  if (
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/ingreso/admin") ||
    request.nextUrl.pathname.startsWith("/ingreso/recuperar")
  ) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("Pragma", "no-cache");
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/docente/:path*",
    "/estudiante/:path*",
    "/ingreso/profesora/:path*",
    "/ingreso/admin/:path*",
    "/ingreso/recuperar/:path*",
  ],
};
