import "server-only";

export function timestampHace24Horas() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}
