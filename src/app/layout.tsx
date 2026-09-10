import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voz y Palabra · Expresión Oral y Escrita I",
  description: "Plataforma de práctica para Expresión Oral y Escrita I. CECyT 1, IPN",
  applicationName: "Voz y Palabra",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://voz-y-palabra.netlify.app"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Voz y Palabra · Expresión Oral y Escrita I",
    description: "Plataforma de práctica para Expresión Oral y Escrita I.",
    type: "website",
    locale: "es_MX",
    url: "/",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  colorScheme: "light dark",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // La CSP usa un nonce nuevo por petición; Next.js solo puede colocarlo en
  // sus scripts cuando el HTML se genera para esa petición.
  await connection();

  return (
    <html
      lang="es"
      className="h-full antialiased"
    >
      <body className="min-h-dvh flex flex-col bg-slate-50 dark:bg-slate-950">{children}</body>
    </html>
  );
}
