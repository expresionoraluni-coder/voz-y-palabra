"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";

export const NOMBRE_COLIBRI = "Lía";

export type AnimacionColibri = "acompanar" | "celebrar" | "animar" | "calma";

export type MensajeColibri = {
  titulo: string;
  texto: string;
};

const MENSAJES_POR_RUTA: { coincide: (ruta: string) => boolean; mensaje: MensajeColibri }[] = [
  {
    coincide: (ruta) => ruta.includes("/cierre"),
    mensaje: { titulo: "Cierra con calma", texto: "Mira lo que lograste antes de pasar a lo siguiente. También eso es aprender." },
  },
  {
    coincide: (ruta) => ruta.startsWith("/estudiante/actividad/"),
    mensaje: { titulo: "Un paso a la vez", texto: "Lee la consigna, toma aire y empieza con una idea. No tiene que salir perfecta a la primera." },
  },
  {
    coincide: (ruta) => ruta.includes("/calendario"),
    mensaje: { titulo: "Tu tiempo cuenta", texto: "Revisa qué sigue y elige una tarea posible para hoy." },
  },
  {
    coincide: (ruta) => ruta.includes("/progreso"),
    mensaje: { titulo: "Observa tu avance", texto: "Los porcentajes son pistas: te ayudan a decidir dónde practicar, no a definirte." },
  },
  {
    coincide: (ruta) => ruta.includes("/portafolio"),
    mensaje: { titulo: "Tu voz tiene recorrido", texto: "Aquí puedes notar cómo tus ideas se han vuelto más claras con la práctica." },
  },
  {
    coincide: (ruta) => ruta.includes("/recursos"),
    mensaje: { titulo: "Busca una pista", texto: "Elige un recurso que responda a tu duda y vuelve a intentarlo a tu ritmo." },
  },
  {
    coincide: () => true,
    mensaje: { titulo: "Aquí voy contigo", texto: "Tu ruta ya está lista. Elige un paso pequeño y concéntrate solo en ese." },
  },
];

export default function ColibriFlotante({
  mensaje,
  navegacionInferior = true,
  animacion = "calma",
}: {
  mensaje?: MensajeColibri;
  navegacionInferior?: boolean;
  animacion?: AnimacionColibri;
}) {
  const pathname = usePathname();
  const mensajeActual = useMemo(
    () => mensaje ?? MENSAJES_POR_RUTA.find((opcion) => opcion.coincide(pathname))!.mensaje,
    [mensaje, pathname],
  );
  const idMensaje = `${pathname}:${mensajeActual.titulo}`;
  const [abierto, setAbierto] = useState(false);
  const [esMovil, setEsMovil] = useState(false);
  const [celebracionCerrada, setCelebracionCerrada] = useState(false);

  useEffect(() => {
    const consulta = window.matchMedia("(max-width: 639px)");
    const actualizarModo = () => {
      setEsMovil(consulta.matches);
      if (!consulta.matches) setAbierto(true);
    };
    actualizarModo();
    consulta.addEventListener("change", actualizarModo);
    return () => consulta.removeEventListener("change", actualizarModo);
  }, []);

  useEffect(() => {
    if (animacion !== "celebrar") return;
    const temporizador = window.setTimeout(() => setCelebracionCerrada(true), 6500);
    return () => window.clearTimeout(temporizador);
  }, [animacion, idMensaje]);

  const posicion = navegacionInferior
    ? "bottom-[calc(5.25rem+env(safe-area-inset-bottom))] sm:bottom-5"
    : "bottom-[max(1rem,env(safe-area-inset-bottom))]";
  const claseAnimacion = {
    acompanar: "animate-colibri-aereo",
    celebrar: "animate-colibri-celebra",
    animar: "animate-colibri-anima",
    calma: "animate-colibri-calma",
  }[animacion];
  const celebrando = animacion === "celebrar" && !celebracionCerrada;
  const mensajeVisible = abierto || celebrando;

  return (
    <aside className={`fixed ${posicion} left-3 z-30 flex items-end gap-1.5 print:hidden sm:left-5`} aria-label={`${NOMBRE_COLIBRI}, colibrí guía`}>
      {mensajeVisible && (
        <div role="status" className={`animate-bocadillo-colibri absolute bottom-[3.35rem] left-0 w-[min(16rem,calc(100vw-6.75rem))] rounded-[1.35rem] border border-violet-200/80 bg-white/95 px-3.5 py-3 shadow-[0_14px_30px_-18px_rgb(79_70_229/0.6)] backdrop-blur-xl dark:border-violet-900/80 dark:bg-slate-900/95 sm:static sm:mb-1 sm:w-auto sm:max-w-[min(17rem,calc(100vw-8rem))] ${celebrando ? "border-amber-300/90 shadow-[0_18px_38px_-18px_rgb(217_119_6/0.62)] dark:border-amber-700/80" : ""}`}>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.11em] text-violet-700 dark:text-violet-300"><Sparkles className={`size-3.5 ${celebrando ? "animate-colibri-destellos" : ""}`} aria-hidden="true" />{NOMBRE_COLIBRI}, tu guía</p>
          <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-slate-50">{mensajeActual.titulo}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{mensajeActual.texto}</p>
          {esMovil && !celebrando && <p className="mt-2 text-[11px] font-semibold text-violet-700 dark:text-violet-300">Toca a Lía cuando necesites una pista.</p>}
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          if (celebrando) {
            setCelebracionCerrada(true);
            setAbierto(false);
            return;
          }
          setAbierto((actual) => !actual);
        }}
        aria-expanded={mensajeVisible}
        aria-label={mensajeVisible ? `Ocultar mensaje de ${NOMBRE_COLIBRI}` : `Abrir mensaje de ${NOMBRE_COLIBRI}`}
        className="group relative flex size-12 shrink-0 items-center justify-center rounded-full border border-white/80 bg-gradient-to-br from-violet-100 via-white to-cyan-100 p-1 shadow-[0_14px_30px_-16px_rgb(79_70_229/0.7)] transition hover:-translate-y-1 hover:shadow-[0_20px_36px_-16px_rgb(79_70_229/0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:from-violet-950 dark:via-slate-900 dark:to-cyan-950 dark:focus-visible:ring-offset-slate-950 sm:size-[3.9rem]"
      >
        <span aria-hidden="true" className="absolute inset-0 rounded-full bg-violet-400/20 blur-md transition group-hover:bg-violet-400/35" />
        {celebrando && <><span aria-hidden="true" className="pointer-events-none absolute -inset-1 rounded-full border-2 border-amber-300/80 animate-colibri-destellos" /><span aria-hidden="true" className="animate-colibri-confeti-uno absolute -left-2 -top-2 text-amber-400">✦</span><span aria-hidden="true" className="animate-colibri-confeti-dos absolute -right-2 top-0 text-fuchsia-400">✦</span><span aria-hidden="true" className="animate-colibri-confeti-tres absolute bottom-0 -right-2 text-cyan-400">✦</span></>}
        <Image src="/ilustraciones/colibri-guia.png" alt="" width={96} height={96} className={`${claseAnimacion} relative size-11 object-contain sm:size-[3.7rem]`} priority={false} />
        <span className="sr-only">{NOMBRE_COLIBRI}, colibrí guía</span>
        <ChevronDown className={`absolute -right-1 -top-1 size-4 rounded-full border border-violet-200 bg-white p-0.5 text-violet-700 transition-transform dark:border-violet-800 dark:bg-slate-900 dark:text-violet-300 ${mensajeVisible ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
    </aside>
  );
}
