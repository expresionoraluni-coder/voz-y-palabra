import { aFechaMexico, hoyMexico } from "./fecha-mexico";

const INTERVALOS_DIAS = [2, 5, 10, 21];
const UN_DIA_MS = 1000 * 60 * 60 * 24;

export type RepasoSugerido = {
  actividadId: string;
  titulo: string;
  unidadId: string;
  fecha: string;
  vencido: boolean;
};

/**
 * Repetición espaciada simple: a partir de la fecha del intento con puntaje
 * bajo, sugiere la próxima fecha de repaso en intervalos crecientes
 * (2/5/10/21 días). Si ya pasaron todos los intervalos, se marca vencido y
 * se sugiere para hoy — no desaparece, para no perder la señal de repaso.
 */
export function proximoRepaso(fechaIntento: string): { fecha: string; vencido: boolean } {
  // fechaIntento suele venir de created_at (timestamptz): se convierte a su
  // día calendario en México antes de sumar días, si no la hora exacta del
  // intento puede correrlo al día siguiente/anterior según le toque en UTC.
  const hoy = new Date(hoyMexico() + "T00:00:00Z").getTime();
  const base = new Date(aFechaMexico(fechaIntento) + "T00:00:00Z").getTime();

  for (const dias of INTERVALOS_DIAS) {
    const candidataMs = base + dias * UN_DIA_MS;
    if (candidataMs >= hoy) {
      return { fecha: new Date(candidataMs).toISOString().slice(0, 10), vencido: false };
    }
  }
  return { fecha: hoyMexico(), vencido: true };
}
