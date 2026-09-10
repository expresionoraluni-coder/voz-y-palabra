import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://voz-y-palabra.netlify.app";
  return ["/", "/ingreso", "/privacidad"].map((path) => ({
    url: new URL(path, base).toString(),
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
