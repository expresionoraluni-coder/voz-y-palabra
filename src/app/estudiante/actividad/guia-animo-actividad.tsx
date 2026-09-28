"use client";

import ColibriFlotante, { type AnimacionColibri, type MensajeColibri } from "@/components/estudiante/colibri-flotante";
import { casoCalibracion } from "@/lib/calibracion-confianza";
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
  const puntajeActual = entregaReciente?.puntajeAuto ?? puntajeAuto;
  const tieneEntregaActual = Boolean(entregaReciente) || tieneEntrega;
  const calibracion = casoCalibracion(confianza, puntajeActual);
  const confianzaAcertada = calibracion === "bien_calibrado_alto" || calibracion === "bien_calibrado_bajo";
  const celebra = tieneEntregaActual && !pendienteRevision && (confianzaAcertada || (puntajeActual ?? 0) >= 85);
  const animacion: AnimacionColibri = celebra ? "celebrar" : tieneEntregaActual ? "animar" : "acompanar";
  const mensaje: MensajeColibri = !tieneEntregaActual
    ? {
        titulo: "Aquí estoy contigo",
        texto: "Empieza con una idea, no con una respuesta perfecta. Lee la consigna, toma aire y avanza paso a paso.",
      }
    : pendienteRevision
      ? {
          titulo: "Ya hiciste tu parte",
          texto: "Tu respuesta ya está en revisión. Mientras tanto, conserva tus ideas: volver a leerlas también es aprender.",
        }
      : celebra
        ? {
            titulo: "¡Lo lograste!",
            texto: confianzaAcertada
              ? "Tu confianza y tu resultado caminaron juntos. Lía celebra contigo este avance."
              : "Tu respuesta salió muy bien. Guarda la estrategia que te ayudó para el siguiente reto.",
          }
        : {
            titulo: "Cada intento deja una pista",
            texto: "Mira con calma lo que sí funcionó y prueba otra forma. Ajustar una idea también es avanzar.",
          };
  return <ColibriFlotante mensaje={mensaje} navegacionInferior={false} animacion={animacion} />;
}
