import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Boton from "@/components/ui/button";

const ALTURAS_ONDA = [18, 34, 52, 30, 44, 60, 38, 26, 48, 20, 36, 56, 32, 22, 40];

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 px-6 py-16">
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

      <div className="relative flex flex-col items-center gap-8 text-center">
        <div className="flex items-end gap-1" aria-hidden="true">
          {ALTURAS_ONDA.map((h, i) => (
            <span
              key={i}
              className="w-1.5 rounded-full bg-gradient-to-t from-violet-400 to-rose-300 animate-pulse"
              style={{ height: `${h}px`, animationDelay: `${i * 90}ms`, animationDuration: "1.8s" }}
            />
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="text-6xl font-bold tracking-tight text-white sm:text-7xl">
            Voz y Palabra
          </h1>
          <p className="text-lg font-medium text-violet-300 sm:text-xl">
            Expresión Oral y Escrita I
          </p>
        </div>

        <p className="max-w-sm text-base text-indigo-100/70">
          Practica, recibe retroalimentación y construye tu portafolio a lo largo de las
          3 unidades del curso.
        </p>

        <Link href="/ingreso">
          <Boton size="md" className="mt-2 !bg-white !text-slate-900 shadow-xl shadow-violet-950/50 hover:!bg-violet-50">
            Entrar
            <ArrowRight className="size-4" aria-hidden="true" />
          </Boton>
        </Link>
      </div>

      <p className="absolute bottom-6 text-xs text-indigo-200/40">
        CECyT 1 &ldquo;Gonzalo Vázquez Vela&rdquo; · IPN
      </p>
    </div>
  );
}
