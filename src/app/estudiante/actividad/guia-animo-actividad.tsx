"use client";

import ColibriFlotante, { type AnimacionColibri, type MensajeColibri } from "@/components/estudiante/colibri-flotante";
import { calibracionEsSolida, casoCalibracion, PUNTAJE_CALIBRACION_SOLIDA } from "@/lib/calibracion-confianza";
import { useEntregaReciente } from "@/lib/entrega-reciente-context";

type GuiaAnimoActividadProps = {
  tieneEntrega: boolean;
  puntajeAuto: number | null;
  pendienteRevision: boolean;
  confianza: number | null;
};

export default function GuiaAnimoActividad({
  tieneEntrega,
  puntajeAuto,
  pendienteRevision,
  confianza,
}: GuiaAnimoActividadProps) {
  const { entregaReciente } = useEntregaReciente();
  const puntajeActual = entregaReciente?.puntajeIntentoAuto ?? entregaReciente?.puntajeAuto ?? puntajeAuto;
  const tieneEntregaActual = Boolean(entregaReciente) || tieneEntrega;
  const calibracion = casoCalibracion(confianza, puntajeActual);
  const confianzaAcertada = calibracionEsSolida(calibracion);
  const resultadoBueno = puntajeActual !== null && puntajeActual >= PUNTAJE_CALIBRACION_SOLIDA;
  const celebra = tieneEntregaActual && !pendienteRevision && (confianzaAcertada || (puntajeActual ?? 0) >= 85);
  const animacion: AnimacionColibri = celebra ? "celebrar" : tieneEntregaActual ? "animar" : "acompanar";
  const mensaje: MensajeColibri = !tieneEntregaActual
    ? {
        titulo: "Aquí estoy contigo",
        texto: "Empieza con una idea y avanza a tu ritmo. Si algo se atora, vuelve a la consigna.",
      }
    : pendienteRevision
      ? {
          titulo: "Ya hiciste tu parte",
          texto: "Tu respuesta ya está en revisión. Reconoce el trabajo que ya hiciste.",
        }
      : celebra
        ? {
            titulo: "¡Lía celebra contigo!",
            texto: confianzaAcertada
              ? "Tu confianza y tu resultado caminaron juntos. Guarda este avance."
              : "Tu respuesta salió muy bien. Guarda la estrategia que te ayudó.",
          }
        : calibracion === "bien_calibrado_bajo"
          ? {
              titulo: "Ya encontraste una pista",
              texto: "Tu expectativa estuvo cerca. Revisa tus errores con calma y prueba otra estrategia.",
            }
        : resultadoBueno
          ? {
              titulo: "¡Vas muy bien!",
              texto: "Terminaste este reto con un buen resultado. Reconoce lo que hiciste bien y sigue a tu ritmo.",
            }
        : {
            titulo: "Cada intento deja una pista",
            texto: "Mira con calma lo que sí funcionó y prueba otra forma. Ajustar también es avanzar.",
          };
  return <ColibriFlotante mensaje={mensaje} navegacionInferior={false} animacion={animacion} />;
}
