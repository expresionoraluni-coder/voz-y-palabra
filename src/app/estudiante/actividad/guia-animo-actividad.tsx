import Image from "next/image";
import { CheckCircle2, HeartHandshake, Sparkles } from "lucide-react";

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
  const mensaje = !tieneEntrega
    ? {
        titulo: "Aquí estoy contigo",
        texto: "Empieza con una idea, no con una respuesta perfecta. Lee la consigna, toma aire y avanza paso a paso.",
        Icono: Sparkles,
        tono: "text-violet-700 dark:text-violet-200",
      }
    : pendienteRevision
      ? {
          titulo: "Ya hiciste tu parte",
          texto: "Tu respuesta ya está en revisión. Mientras tanto, conserva tus ideas: volver a leerlas también es aprender.",
          Icono: HeartHandshake,
          tono: "text-sky-700 dark:text-sky-200",
        }
      : puntajeAuto !== null && puntajeAuto >= 70
        ? {
            titulo: "¡Buen trabajo!",
            texto: "Tu respuesta muestra que vas encontrando el camino. Guarda esa estrategia para el siguiente reto.",
            Icono: CheckCircle2,
            tono: "text-emerald-700 dark:text-emerald-200",
          }
        : {
            titulo: "Cada intento deja una pista",
            texto: "Mira con calma lo que sí funcionó y prueba otra forma. Ajustar una idea también es avanzar.",
            Icono: HeartHandshake,
            tono: "text-amber-700 dark:text-amber-200",
          };

  const Icono = mensaje.Icono;

  return (
    <aside
      aria-label="Acompañamiento durante la actividad"
      className="relative isolate overflow-hidden rounded-[1.5rem] border border-violet-200/80 bg-gradient-to-r from-violet-50 via-white to-sky-50 p-4 shadow-[0_16px_32px_-28px_rgb(79_70_229/0.7)] dark:border-violet-900/70 dark:from-violet-950/35 dark:via-slate-900 dark:to-sky-950/25 sm:flex sm:items-center sm:gap-4"
    >
      <div aria-hidden="true" className="absolute -left-6 bottom-0 size-28 rounded-full bg-fuchsia-200/45 blur-2xl dark:bg-fuchsia-700/15" />
      <Image
        src="/ilustraciones/colibri-guia.png"
        alt=""
        width={176}
        height={176}
        className="animate-colibri-flota relative mx-auto -mb-5 -mt-7 h-28 w-28 object-contain sm:mb-0 sm:mt-0 sm:h-24 sm:w-24"
      />
      <div className="relative min-w-0 text-center sm:text-left">
        <p className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] ${mensaje.tono}`}>
          <Icono className="size-3.5" aria-hidden="true" />
          Colibrí guía
        </p>
        <h2 className="mt-1 text-base font-extrabold text-slate-900 dark:text-slate-50">{mensaje.titulo}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{mensaje.texto}</p>
      </div>
    </aside>
  );
}
