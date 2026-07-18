// Detecta un link de YouTube (youtube.com/watch?v=, youtu.be/, youtube.com/embed/)
// y devuelve la URL de embed correspondiente. Cualquier otro dominio se deja
// como link normal en vez de intentar embeberlo a ciegas.
export function urlEmbedYoutube(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (u.pathname.startsWith("/embed/")) return url;
    }
    return null;
  } catch {
    return null;
  }
}
