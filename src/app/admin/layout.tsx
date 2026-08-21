import Link from "next/link";
import { LayoutDashboard, MessageSquareText, ShieldCheck } from "lucide-react";
import { requerirAdministrador } from "@/lib/supabase/requerir-administrador";
import CerrarSesion from "@/components/cerrar-sesion";
import AvisoSinConexion from "@/components/ui/aviso-sin-conexion";
import ControlSesionAdmin from "./control-sesion-admin";

export default async function LayoutAdministrador({ children }: { children: React.ReactNode }) {
  const { administrador, mfa } = await requerirAdministrador({ permitirConfiguracionMfa: true });

  return (
    <>
      <a
        href="#contenido-admin"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium text-white"
      >
        Saltar al contenido
      </a>
      <AvisoSinConexion mensaje="Estás sin conexión. La atención de reportes se reanudará cuando vuelva la conexión." />
      <ControlSesionAdmin />
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">Voz y Palabra</p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-50">Atención y monitoreo</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Sesión de {administrador.nombre}</p>
          </div>
          <nav aria-label="Navegación administrativa" className="order-3 flex w-full items-center gap-1 border-t border-slate-100 pt-3 text-sm dark:border-slate-800 sm:order-none sm:w-auto sm:border-0 sm:pt-0">
            <Link href="/admin" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50">
              <LayoutDashboard className="size-4" aria-hidden="true" />
              Panel
            </Link>
            <Link href="/admin/reportes" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50">
              <MessageSquareText className="size-4" aria-hidden="true" />
              Reportes
            </Link>
            <Link href="/admin/seguridad" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Seguridad
              {!mfa.tieneFactorVerificado && <span className="size-2 rounded-full bg-amber-500" aria-label="Configuración pendiente" />}
            </Link>
          </nav>
          <CerrarSesion />
        </div>
      </header>
      <main id="contenido-admin">{children}</main>
    </>
  );
}
