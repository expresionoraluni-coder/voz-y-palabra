"use client";

import { useEffect, useState } from "react";
import { Award, X } from "lucide-react";

type Insignia = { nombre: string; descripcion: string };

function claveAlmacenamiento(estudianteId: string) {
  // Por estudiante: en equipos compartidos del plantel, dos alumnos en el
  // mismo navegador no deben compartir qué insignias ya "vio" el otro.
  return `vyp_insignias_vistas:${estudianteId}`;
}

export default function CelebracionInsignia({
  insignias,
  estudianteId,
}: {
  insignias: Insignia[];
  estudianteId: string;
}) {
  const [nuevas, setNuevas] = useState<Insignia[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const clave = claveAlmacenamiento(estudianteId);

    let vistas: string[] = [];
    try {
      vistas = JSON.parse(localStorage.getItem(clave) ?? "[]");
    } catch {
      vistas = [];
    }

    const encontradas = insignias.filter((i) => !vistas.includes(i.nombre));
    if (encontradas.length > 0) setNuevas(encontradas);

    try {
      localStorage.setItem(clave, JSON.stringify(insignias.map((i) => i.nombre)));
    } catch {
      // Safari privado o cuota llena: no pasa nada grave, en la próxima
      // visita puede volver a mostrar una insignia ya vista.
    }
    // Solo debe correr cuando cambia el conjunto de insignias otorgadas, no en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estudianteId, insignias.map((i) => i.nombre).join(",")]);

  if (nuevas.length === 0) return null;

  function descartar(nombre: string) {
    setNuevas((prev) => prev.filter((n) => n.nombre !== nombre));
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
      {nuevas.map((i) => (
        <div
          key={i.nombre}
          className="animate-insignia-pop pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3 shadow-lg shadow-amber-500/20 dark:border-amber-900 dark:bg-slate-900"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/30">
            <Award className="size-5" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              ¡Nueva insignia! {i.nombre}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{i.descripcion}</p>
          </div>
          <button
            onClick={() => descartar(i.nombre)}
            className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Cerrar"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
