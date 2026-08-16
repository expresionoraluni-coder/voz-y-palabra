import { intentosDeEntregaAuto, puedeAbrirDependiente } from "@/lib/intentos-auto";

export type MotivoBloqueoActividad =
  | "dependencia"
  | "dependencia_reflexion"
  | "unidad_anterior_actividades"
  | "unidad_anterior_reflexion_actividad"
  | "unidad_anterior_reflexion_unidad"
  | "unidad_anterior_reflexiones";

export function detalleBloqueoActividad(motivo: string | null | undefined) {
  switch (motivo) {
    case "dependencia":
    case "1":
      return {
        titulo: "Completa la actividad anterior",
        descripcion:
          "Esta actividad depende de otra que todavía no está lista. Completa la actividad anterior y, si necesitas mejorarla, vuelve a intentarlo antes de continuar.",
      };
    case "dependencia_reflexion":
      return {
        titulo: "Guarda la reflexión de la actividad anterior",
        descripcion:
          "La actividad anterior ya está lista, pero falta guardar su reflexión. Escríbela y guárdala para abrir esta actividad.",
      };
    case "unidad_anterior_actividades":
      return {
        titulo: "Termina las actividades de la unidad anterior",
        descripcion:
          "Antes de continuar, completa todas las actividades de la unidad anterior. La siguiente unidad se abrirá cuando termines ese recorrido.",
      };
    case "unidad_anterior_reflexion_actividad":
      return {
        titulo: "Guarda la reflexión de la última actividad",
        descripcion:
          "Terminaste las actividades de la unidad anterior, pero todavía falta guardar la reflexión de su última actividad para continuar.",
      };
    case "unidad_anterior_reflexion_unidad":
      return {
        titulo: "Escribe la reflexión de cierre",
        descripcion:
          "La última actividad ya tiene su reflexión. Ahora completa la reflexión final de la unidad anterior para abrir la siguiente.",
      };
    case "unidad_anterior_reflexiones":
      return {
        titulo: "Completa las reflexiones de la unidad anterior",
        descripcion:
          "Antes de continuar, guarda la reflexión de la última actividad y la reflexión final de la unidad anterior.",
      };
    default:
      return null;
  }
}

// Compartido entre unidad/[id]/page.tsx (gating secuencial) e inicio/page.tsx
// (cálculo de la unidad activa) — una sola definición de "unidad completa"
// para que las dos páginas no se desalineen.
export function unidadEstaCompleta(totalActividades: number, actividadesCompletadas: number): boolean {
  return totalActividades > 0 && actividadesCompletadas === totalActividades;
}

/**
 * Una entrega autocalificable solo cuenta cuando alcanzó el mínimo o agotó
 * sus tres intentos. Las actividades abiertas no tienen puntaje automático,
 * así que cuentan al guardarse.
 */
export function entregaCuentaComoCompletada(
  entrega: { puntaje_auto: number | null; respuesta?: unknown } | null | undefined,
): boolean {
  if (!entrega) return false;
  if (entrega.puntaje_auto === null) return true;
  return puedeAbrirDependiente(entrega.puntaje_auto, entrega.respuesta);
}

export { intentosDeEntregaAuto, puedeAbrirDependiente };
