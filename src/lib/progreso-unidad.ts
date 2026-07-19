// Compartido entre unidad/[id]/page.tsx (gating secuencial) e inicio/page.tsx
// (cálculo de la unidad activa) — una sola definición de "unidad completa"
// para que las dos páginas no se desalineen.
export function unidadEstaCompleta(totalActividades: number, actividadesCompletadas: number): boolean {
  return totalActividades > 0 && actividadesCompletadas === totalActividades;
}
