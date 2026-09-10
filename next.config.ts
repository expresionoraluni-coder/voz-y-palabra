import type { NextConfig } from "next";

const cabecerasSeguridad = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // La demostración local puede abrirse desde 127.0.0.1 en el navegador
  // integrado; Next necesita permitir ese origen para sus recursos dev/HMR.
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [{ source: "/:path*", headers: cabecerasSeguridad }];
  },
};

export default nextConfig;
