"use client";

import { ArrowRight, BookOpen, Lightbulb, Sparkles, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Boton from "@/components/ui/button";

function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] || "estudiante";
}

export default function BienvenidaPrimerIngreso({ nombre }: { nombre: string }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function comenzarRuta() {
    if (cargando) return;
    setCargando(true);
    setError(null);

    const { data, error: rpcError } = await createClient().rpc("marcar_bienvenida_estudiante");
    if (rpcError || data !== true) {
      setError("No pudimos guardar este paso. Revisa tu conexión e inténtalo de nuevo.");
      setCargando(false);
      return;
    }

    router.refresh();
  }

  return (
    <section
      aria-labelledby="bienvenida-primer-ingreso"
      className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-3xl items-center px-4 py-8 sm:px-6 sm:py-12"
    >
      <div className="w-full overflow-hidden rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5 shadow-xl shadow-indigo-950/10 dark:border-indigo-900/70 dark:from-indigo-950/70 dark:via-slate-900 dark:to-violet-950/50 dark:shadow-black/20 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
            <Sparkles className="size-8" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">Tu primer ingreso</p>
          <h1 id="bienvenida-primer-ingreso" className="mt-3 max-w-xl text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
            ¡Qué gusto tenerte aquí, {primerNombre(nombre)}!
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg">
            Este será tu espacio para practicar, reflexionar y descubrir nuevas formas de expresar tus ideas con claridad y seguridad. Avanza a tu ritmo: cada actividad está pensada para ayudarte a aprender paso a paso.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <article className="rounded-2xl border border-indigo-100/80 bg-white/75 p-4 dark:border-indigo-900/60 dark:bg-slate-950/35">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/70 dark:text-indigo-200">
              <BookOpen className="size-5" aria-hidden="true" />
            </div>
            <h2 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-50">Explora</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">Recorre las unidades disponibles y comienza con la actividad que te indique tu ruta.</p>
          </article>
          <article className="rounded-2xl border border-violet-100/80 bg-white/75 p-4 dark:border-violet-900/60 dark:bg-slate-950/35">
            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/70 dark:text-violet-200">
              <Lightbulb className="size-5" aria-hidden="true" />
            </div>
            <h2 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-50">Reflexiona</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">Lee con calma, piensa en tus respuestas y guarda tu reflexión antes de realizar cada actividad.</p>
          </article>
          <article className="rounded-2xl border border-emerald-100/80 bg-white/75 p-4 dark:border-emerald-100/20 dark:bg-slate-950/35">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/70 dark:text-emerald-200">
              <Target className="size-5" aria-hidden="true" />
            </div>
            <h2 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-50">Avanza</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">Tus respuestas, reflexiones y calificaciones quedarán guardadas para consultar tu progreso.</p>
          </article>
        </div>

        <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 dark:border-amber-800/70 dark:bg-amber-950/30">
          <Lightbulb className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            <strong>Un pequeño consejo para comenzar:</strong> algunas actividades pueden tener más de un nivel o un intento alternativo. Si tienes otra oportunidad disponible, la plataforma te lo indicará.
          </p>
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Esta es una guía breve para comenzar. Si después quieres conocer con más detalle cómo funciona la plataforma, puedes consultar la guía completa en el apartado <strong className="font-semibold text-slate-700 dark:text-slate-200">Recursos</strong>.
        </p>

        {error && (
          <p className="mt-5 text-center text-sm text-red-700 dark:text-red-300" role="alert">
            {error}
          </p>
        )}

        <div className="mt-7 flex justify-center">
          <Boton type="button" size="md" onClick={comenzarRuta} cargando={cargando} className="min-w-56">
            {cargando ? "Guardando…" : "Comenzar mi ruta"}
            {!cargando && <ArrowRight className="size-4" aria-hidden="true" />}
          </Boton>
        </div>
      </div>
    </section>
  );
}
