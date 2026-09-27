import Link from "next/link";
import { ArrowRight } from "lucide-react";
import MarcaVozPalabra from "@/components/ui/marca-voz-palabra";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 px-6 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-violet-500/20 blur-3xl"
      />

      <div className="relative flex flex-col items-center gap-7 text-center">
        <MarcaVozPalabra />

        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200/80">
            Plataforma de aprendizaje
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-7xl">
            Voz y Palabra
          </h1>
          <p className="text-lg font-medium text-violet-300 sm:text-xl">
            Expresión Oral y Escrita I
          </p>
        </div>

        <p className="max-w-md text-base leading-relaxed text-indigo-100/75">
          Practica, recibe orientación cuando la necesites y construye tu portafolio a lo largo de las
          3 unidades del curso.
        </p>

        <div className="mt-1 flex flex-col items-center gap-3">
          <Link
            href="/ingreso"
            className="inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-slate-900 shadow-xl shadow-violet-950/50 transition-[color,background-color,border-color,transform] duration-150 hover:bg-violet-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-950"
          >
            Acceder al curso
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <p className="text-xs text-indigo-100/65">Estudiantes y profesoras entran desde aquí.</p>
        </div>
      </div>

      <div className="absolute bottom-5 flex flex-wrap justify-center gap-x-2 gap-y-1 px-6 text-center text-xs text-indigo-200/70">
        CECyT 1 &ldquo;Gonzalo Vázquez Vela&rdquo; · IPN
        <span aria-hidden="true">·</span>
        <Link href="/privacidad" className="underline underline-offset-2 hover:text-indigo-100/70">Uso y privacidad</Link>
      </div>
    </main>
  );
}
