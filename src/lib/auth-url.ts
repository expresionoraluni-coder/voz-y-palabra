const ORIGEN_PRODUCCION = process.env.NEXT_PUBLIC_SITE_URL ?? "https://voz-y-palabra.netlify.app";

const RUTAS_CONFIRMACION = new Set([
  "/ingreso/profesora",
  "/ingreso/profesora/verificar",
]);

export function normalizarOrigen(valor: string | null | undefined): string | null {
  if (!valor) return null;
  try {
    const url = new URL(valor);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function origenesAplicacionPermitidos(): Set<string> {
  const candidatos = [ORIGEN_PRODUCCION, process.env.NEXT_PUBLIC_SITE_URL];
  if (process.env.NODE_ENV !== "production") {
    candidatos.push("http://localhost:3000", "http://127.0.0.1:3000");
  }
  return new Set(
    candidatos
      .map(normalizarOrigen)
      .filter((origen): origen is string => Boolean(origen)),
  );
}

export function origenAplicacionDesdeEncabezados(encabezados: Headers): string | null {
  const permitidos = origenesAplicacionPermitidos();
  const origen = normalizarOrigen(encabezados.get("origin"));
  if (origen && permitidos.has(origen)) return origen;

  const host = encabezados.get("host");
  if (!host) return null;
  const protocolo = encabezados.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const derivado = normalizarOrigen(`${protocolo}://${host}`);
  return derivado && permitidos.has(derivado) ? derivado : null;
}

/**
 * Resuelve una ruta de retorno una sola vez y compara el origen efectivo.
 * La comparación posterior al parseo también cierra variantes con barras
 * invertidas y caracteres de control que WHATWG interpreta como otro host.
 */
export function destinoConfirmacionSeguro(
  valor: string | null,
  base: string | URL,
  fallback = "/ingreso/profesora",
): URL {
  const baseSolicitada = new URL(base);
  const origenSeguro = origenesAplicacionPermitidos().has(baseSolicitada.origin)
    ? baseSolicitada.origin
    : ORIGEN_PRODUCCION;
  const baseUrl = new URL("/auth/confirm", origenSeguro);
  const fallbackUrl = new URL(fallback, baseUrl);
  if (!valor) return fallbackUrl;

  try {
    const destino = new URL(valor, baseUrl);
    if (destino.origin !== baseUrl.origin || !RUTAS_CONFIRMACION.has(destino.pathname)) {
      return fallbackUrl;
    }
    return destino;
  } catch {
    return fallbackUrl;
  }
}

export function callbackConfirmacionDocente(origen: string): string {
  const normalizado = normalizarOrigen(origen);
  const origenSeguro = normalizado && origenesAplicacionPermitidos().has(normalizado)
    ? normalizado
    : ORIGEN_PRODUCCION;
  const callback = new URL("/auth/confirm", origenSeguro);
  callback.searchParams.set("next", "/ingreso/profesora/verificar");
  return callback.toString();
}
