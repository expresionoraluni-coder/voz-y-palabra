import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { requerirAdministrador } from "@/lib/supabase/requerir-administrador";
import { Card } from "@/components/ui/card";
import ConfigurarMfa from "./configurar-mfa";

export default async function SeguridadAdministrador() {
  const { administrador, mfa } = await requerirAdministrador({ permitirConfiguracionMfa: true });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <Link href="/admin" className="inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver al panel
      </Link>

      <section className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Seguridad de la cuenta</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Protege el acceso administrativo</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {administrador.nombre}, usa una aplicación autenticadora para agregar una segunda comprobación además de tu contraseña.
          Esta protección no se aplica a estudiantes ni a docentes.
        </p>
      </section>

      <Card className="flex items-start gap-3 border-indigo-200 bg-indigo-50/70 p-5 dark:border-indigo-900/70 dark:bg-indigo-950/30">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <p className="font-semibold text-slate-900 dark:text-slate-50">{mfa.tieneFactorVerificado ? "Protección activa" : "Configuración necesaria"}</p>
          <p className="mt-1">
            {mfa.tieneFactorVerificado
              ? "Tu cuenta ya usa un segundo factor. En los siguientes ingresos se solicitará el código de tu aplicación autenticadora."
              : "Configúrala ahora. Después de verificarla, el panel administrativo y sus datos exigirán este segundo factor."}
          </p>
        </div>
      </Card>

      <ConfigurarMfa activo={mfa.tieneFactorVerificado} />
    </div>
  );
}
