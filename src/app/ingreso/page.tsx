import Link from "next/link";
import { GraduationCap, UserRound, ArrowRight, Sparkles } from "lucide-react";
import { CardLink } from "@/components/ui/card";
import MarcaVozPalabra from "@/components/ui/marca-voz-palabra";

export default function Ingreso() {
  return (
    <main className="relative flex min-h-dvh flex-1 flex-col items-center justify-center overflow-hidden px-6 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-500/15" />
      <div className="relative flex w-full max-w-sm flex-col gap-6">
        <header className="flex flex-col items-center gap-3 text-center">
          <MarcaVozPalabra compacta />
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Voz y Palabra
          </p>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              ¿Cómo quieres entrar?
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Elige tu perfil para acceder a las herramientas del curso.
            </p>
          </div>
        </header>

        <div className="flex flex-col gap-3">
          <Link href="/ingreso/estudiante" className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950">
            <CardLink className="group flex items-center gap-4 border-indigo-100 bg-gradient-to-br from-white to-indigo-50/70 px-5 py-4 dark:border-indigo-900/70 dark:from-slate-900 dark:to-indigo-950/30">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <GraduationCap className="size-5" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900 dark:text-slate-50">Soy estudiante</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Usa tu nombre, código de grupo y NIP
              </p>
            </div>
            <ArrowRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-0.5 dark:text-slate-600" aria-hidden="true" />
            </CardLink>
        </Link>
          <Link href="/ingreso/profesora" className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950">
            <CardLink className="group flex items-center gap-4 px-5 py-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <UserRound className="size-5" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900 dark:text-slate-50">Soy profesora</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Entra con tu correo y contraseña
              </p>
            </div>
            <ArrowRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-0.5 dark:text-slate-600" aria-hidden="true" />
            </CardLink>
        </Link>
        </div>

        <Link href="/privacidad" className="self-center text-center text-xs text-slate-500 underline underline-offset-2 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:text-slate-300">
          Uso y privacidad
        </Link>
      </div>
    </main>
  );
}
