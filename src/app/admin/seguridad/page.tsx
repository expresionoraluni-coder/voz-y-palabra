import Link from "next/link";
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import { requerirAdministrador } from "@/lib/supabase/requerir-administrador";
import { Card } from "@/components/ui/card";
import ConfigurarMfa from "./configurar-mfa";

export default async function SeguridadAdministrador() {
  const { administrador, mfa } = await requerirAdministrador({ permitirConfiguracionMfa: true });

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <Link href="/admin" className="inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver al panel
      </Link>

      <section className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Seguridad de la cuenta</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Protección del acceso</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {administrador.nombre}, aquí solo necesitas revisar una cosa: que tu aplicación autenticadora esté activa para entrar al panel.
        </p>
      </section>

      <Card className="flex items-start gap-3 border-indigo-200 bg-indigo-50/70 p-5 dark:border-indigo-900/70 dark:bg-indigo-950/30">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <p className="font-semibold text-slate-900 dark:text-slate-50">{mfa.tieneFactorVerificado ? "Protección activa" : "Configuración necesaria"}</p>
          <p className="mt-1">
            {mfa.tieneFactorVerificado
              ? "Todo listo. El panel de reportes está desbloqueado y cada nuevo ingreso pedirá un código de tu aplicación autenticadora."
              : "Es el único paso pendiente. Al verificarla, se desbloquearán el panel, los reportes y la ayuda."}
          </p>
        </div>
      </Card>

      <ConfigurarMfa activo={mfa.tieneFactorVerificado} />

      <details className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-100">Otras opciones de seguridad</summary>
        <div className="grid gap-4 border-t border-slate-100 p-5 dark:border-slate-800 sm:grid-cols-2">
          <div className="flex items-start gap-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            <KeyRound className="mt-0.5 size-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-slate-900 dark:text-slate-50">Cambiar contraseña</p>
              <p>Usa el enlace por correo si necesitas reemplazarla.</p>
              <Link href="/ingreso/recuperar" className="w-fit font-medium text-indigo-600 underline underline-offset-2 dark:text-indigo-400">Solicitar enlace</Link>
            </div>
          </div>
          <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            <p className="font-semibold text-slate-900 dark:text-slate-50">Cierre por inactividad</p>
            <p className="mt-1">La sesión administrativa se cierra después de 30 minutos sin actividad.</p>
          </div>
        </div>
      </details>
    </div>
  );
}
