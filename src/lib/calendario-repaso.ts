const INTERVALOS_DIAS = [2, 5, 10, 21];

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
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const base = new Date(fechaIntento);
  base.setHours(0, 0, 0, 0);

  for (const dias of INTERVALOS_DIAS) {
    const candidata = new Date(base);
    candidata.setDate(candidata.getDate() + dias);
    if (candidata.getTime() >= hoy.getTime()) {
      return { fecha: candidata.toISOString().slice(0, 10), vencido: false };
    }
  }
  return { fecha: hoy.toISOString().slice(0, 10), vencido: true };
}
