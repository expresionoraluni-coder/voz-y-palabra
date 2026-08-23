import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voz y Palabra · Expresión Oral y Escrita I",
  description: "Plataforma de práctica para Expresión Oral y Escrita I. CECyT 1, IPN",
  applicationName: "Voz y Palabra",
  openGraph: {
    title: "Voz y Palabra · Expresión Oral y Escrita I",
    description: "Plataforma de práctica para Expresión Oral y Escrita I.",
    type: "website",
    locale: "es_MX",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className="h-full antialiased"
    >
      <body className="min-h-dvh flex flex-col bg-slate-50 dark:bg-slate-950">{children}</body>
    </html>
  );
}
