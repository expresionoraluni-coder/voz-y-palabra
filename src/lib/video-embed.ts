const HOSTS_VIDEO_PERMITIDOS = new Set([
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

export function esVideoUrlPermitida(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" && !u.username && !u.password && HOSTS_VIDEO_PERMITIDOS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

// Detecta un link de YouTube (youtube.com/watch?v=, youtu.be/, youtube.com/embed/)
// y devuelve la URL de embed correspondiente. Las URLs se aceptan únicamente
// desde hosts de YouTube y sobre HTTPS.
export function urlEmbedYoutube(url: string): string | null {
  try {
    const u = new URL(url);
    if (!esVideoUrlPermitida(url)) return null;
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1);
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (u.hostname === "youtube.com" || u.hostname === "www.youtube.com" || u.hostname === "youtube-nocookie.com" || u.hostname === "www.youtube-nocookie.com") {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
      }
      if (u.pathname.startsWith("/embed/")) return `https://www.youtube-nocookie.com${u.pathname}${u.search}`;
    }
    return null;
  } catch {
    return null;
  }
}
