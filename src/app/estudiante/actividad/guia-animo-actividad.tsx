import ColibriFlotante, { type MensajeColibri } from "@/components/estudiante/colibri-flotante";

type GuiaAnimoActividadProps = {
  tieneEntrega: boolean;
  puntajeAuto: number | null;
  pendienteRevision: boolean;
};

export default function GuiaAnimoActividad({
  tieneEntrega,
  puntajeAuto,
  pendienteRevision,
}: GuiaAnimoActividadProps) {
  const mensaje: MensajeColibri = !tieneEntrega
    ? {
        titulo: "Aquí estoy contigo",
        texto: "Empieza con una idea, no con una respuesta perfecta. Lee la consigna, toma aire y avanza paso a paso.",
      }
    : pendienteRevision
      ? {
          titulo: "Ya hiciste tu parte",
          texto: "Tu respuesta ya está en revisión. Mientras tanto, conserva tus ideas: volver a leerlas también es aprender.",
        }
      : puntajeAuto !== null && puntajeAuto >= 70
        ? {
            titulo: "¡Buen trabajo!",
            texto: "Tu respuesta muestra que vas encontrando el camino. Guarda esa estrategia para el siguiente reto.",
          }
        : {
            titulo: "Cada intento deja una pista",
            texto: "Mira con calma lo que sí funcionó y prueba otra forma. Ajustar una idea también es avanzar.",
          };
  return <ColibriFlotante mensaje={mensaje} navegacionInferior={false} />;
}
