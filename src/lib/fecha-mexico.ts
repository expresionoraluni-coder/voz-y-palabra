const ZONA = "America/Mexico_City";

/**
 * El servidor corre en UTC; sin esto, "hoy" a medianoche del servidor cae
 * ~6 horas antes del día real en México, corriendo racha, calendario y
 * repaso espaciado. CDMX ya no observa horario de verano (desde 2022), así
 * que sumar/restar 24h siempre mueve exactamente un día calendario aquí.
 */
export function hoyMexico(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date());
}

/** Convierte cualquier instante (Date o ISO string, típicamente un timestamptz de Supabase) a su fecha calendario YYYY-MM-DD en México. */
export function aFechaMexico(fecha: Date | string): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(d);
}
