import type { NextConfig } from "next";

// VP-M5: cabeceras de seguridad HTTP — no había ninguna configurada.
// microphone=(self) porque grabacion-rubrica.tsx graba audio en el navegador;
// connect-src incluye Supabase porque toda la app habla con su API REST/Auth.
//
// script-src necesita 'unsafe-eval' SOLO en desarrollo: "next dev --webpack"
// usa eval() para el source map de cada módulo (devtool eval-source-map) y
// para React Refresh — sin esto, el navegador bloquea esa evaluación en
// silencio (no aparece como error de React) y la hidratación nunca termina:
// la página se ve normal pero ningún botón, formulario o link con JS
// responde. En "next build" no se usa eval(), así que producción se queda
// sin 'unsafe-eval'.
const scriptSrc =
  process.env.NODE_ENV === "production" ? "script-src 'self' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

const cabecerasSeguridad = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: cabecerasSeguridad }];
  },
};

export default nextConfig;
