import Link from "next/link";
import { GraduationCap, UserRound, ArrowRight } from "lucide-react";
import { CardLink } from "@/components/ui/card";

export default function Ingreso() {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-8 px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        ¿Quién eres?
      </h1>
      <div className="flex w-full max-w-sm flex-col gap-3">
        <Link href="/ingreso/estudiante">
          <CardLink className="flex items-center gap-4 px-5 py-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <GraduationCap className="size-5" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900 dark:text-slate-50">Soy estudiante</p>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                Entra con tu nombre y el código de tu grupo
              </p>
            </div>
            <ArrowRight className="size-4 text-slate-300 dark:text-slate-600" aria-hidden="true" />
          </CardLink>
        </Link>
        <Link href="/ingreso/profesora">
          <CardLink className="flex items-center gap-4 px-5 py-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <UserRound className="size-5" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900 dark:text-slate-50">Soy profesora</p>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                Entra con tu correo y contraseña
              </p>
            </div>
            <ArrowRight className="size-4 text-slate-300 dark:text-slate-600" aria-hidden="true" />
          </CardLink>
        </Link>
      </div>
    </div>
  );
}
