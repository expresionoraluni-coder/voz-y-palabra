import Link from "next/link";
import { ArrowRight, MessagesSquare } from "lucide-react";
import Boton from "@/components/ui/button";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-indigo-200/40 blur-3xl dark:bg-indigo-900/20"
      />

      <div className="relative flex flex-col items-center gap-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
          <MessagesSquare className="size-7" aria-hidden="true" />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-50">
            Voz y Palabra
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400">
            Expresión Oral y Escrita I
          </p>
        </div>

        <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Practica, recibe retroalimentación y construye tu portafolio a lo largo de las
          3 unidades del curso.
        </p>

        <Link href="/ingreso">
          <Boton size="md" className="mt-2">
            Entrar
            <ArrowRight className="size-4" aria-hidden="true" />
          </Boton>
        </Link>
      </div>

      <p className="absolute bottom-6 text-xs text-slate-400 dark:text-slate-600">
        CECyT 1 &ldquo;Gonzalo Vázquez Vela&rdquo; · IPN
      </p>
    </div>
  );
}
