import {
  intentosDeEntregaAuto,
  puedeAbrirDependiente,
  requiereReintentoAlternativo,
} from "@/lib/intentos-auto";

export type MotivoBloqueoActividad =
  | "dependencia"
  | "dependencia_reflexion"
  | "dependencia_reintento"
  | "unidad_anterior_actividades"
  | "unidad_anterior_reintento"
  | "unidad_anterior_reflexion_actividad"
  | "unidad_anterior_reflexion_unidad"
  | "unidad_anterior_confianza"
  | "unidad_inicio";

export function detalleBloqueoActividad(motivo: string | null | undefined) {
  switch (motivo) {
    case "dependencia":
    case "1":
      return {
        titulo: "Completa la actividad anterior",
        descripcion:
          "Esta actividad depende de otra que todavía no está lista. Completa y guarda la actividad anterior antes de continuar.",
      };
    case "dependencia_reflexion":
      return {
        titulo: "Guarda las reflexiones pendientes",
        descripcion:
          "Antes de avanzar, guarda la reflexión pendiente de las actividades anteriores. Esta pausa es parte obligatoria del recorrido.",
      };
    case "dependencia_reintento":
      return {
        titulo: "Mejora tu resultado antes de continuar",
        descripcion:
          "Tu resultado es menor de 70 %. Resuelve el ejercicio alternativo y guarda ese segundo intento antes de avanzar.",
      };
    case "unidad_inicio":
      return {
        titulo: "Completa el inicio de la unidad",
        descripcion: "Define tu meta y registra tu confianza inicial antes de comenzar las actividades de esta unidad.",
      };
    case "unidad_anterior_actividades":
      return {
        titulo: "Termina las actividades de la unidad anterior",
        descripcion:
          "Antes de continuar, completa todas las actividades de la unidad anterior. La siguiente unidad se abrirá cuando termines ese recorrido.",
      };
    case "unidad_anterior_reintento":
      return {
        titulo: "Mejora las actividades pendientes",
        descripcion:
          "En la unidad anterior hay una actividad con menos de 70 %. Resuelve su ejercicio alternativo antes de abrir esta unidad.",
      };
    case "unidad_anterior_reflexion_actividad":
      return {
        titulo: "Completa las reflexiones pendientes",
        descripcion:
          "Antes de abrir la siguiente unidad, guarda la reflexión de cada actividad terminada en la unidad anterior.",
      };
    case "unidad_anterior_reflexion_unidad":
      return {
        titulo: "Escribe la reflexión de cierre",
        descripcion:
          "Las actividades ya están terminadas. Ahora completa la reflexión final de la unidad anterior para abrir la siguiente.",
      };
    case "unidad_anterior_confianza":
      return {
        titulo: "Completa la confianza final",
        descripcion: "La unidad anterior todavía necesita tu nivel de seguridad al terminar para desbloquear la siguiente.",
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

export function entregaCuentaComoCompletada(
  entrega: { puntaje_auto: number | null; respuesta?: unknown } | null | undefined,
  contenido?: unknown,
): boolean {
  if (!entrega) return false;
  // La entrega ya representa un trabajo guardado. El puntaje no puede volver
  // a bloquear la ruta ni convertir una fila existente en una actividad
  // incompleta; los intentos se controlan al guardar la actividad.
  return !requiereReintentoAlternativo(contenido, entrega.respuesta, entrega.puntaje_auto);
}

export { intentosDeEntregaAuto, puedeAbrirDependiente };
