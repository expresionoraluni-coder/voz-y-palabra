import type { Metadata } from "next";
import { Cookie, MonitorCheck, ShieldCheck } from "lucide-react";
import BotonPreferencias from "@/components/legal/boton-preferencias";
import MarcoLegal from "@/components/legal/marco-legal";

export const metadata: Metadata = {
  title: "Cookies y preferencias · Voz y Palabra",
  description: "Información y controles de cookies para Voz y Palabra.",
};

export default function Cookies() {
  return (
    <MarcoLegal etiqueta="Control del navegador" titulo="Cookies y preferencias" descripcion="Te explicamos qué se guarda en tu navegador, por qué se necesita y cómo cambiar tu elección sin perder el acceso al curso.">
      <section className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-[1.5rem] border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/70 dark:bg-indigo-950/25"><ShieldCheck className="size-5 text-indigo-600 dark:text-indigo-300" aria-hidden="true" /><h2 className="mt-3 font-bold text-slate-900 dark:text-slate-50">Necesarias</h2><p className="mt-1 text-sm leading-relaxed">Las cookies de sesión de Supabase permiten iniciar sesión, mantenerla protegida y cerrar sesión de forma segura.</p></article>
        <article className="rounded-[1.5rem] border border-violet-100 bg-violet-50/70 p-4 dark:border-violet-900/70 dark:bg-violet-950/25"><MonitorCheck className="size-5 text-violet-600 dark:text-violet-300" aria-hidden="true" /><h2 className="mt-3 font-bold text-slate-900 dark:text-slate-50">Preferencia local opcional</h2><p className="mt-1 text-sm leading-relaxed">El navegador guarda una pequeña preferencia en el dispositivo que usas para recordar si autorizaste medir la utilidad de la ayuda. No es una cuenta, no contiene respuestas y no se envía a Supabase por sí sola.</p></article>
      </section>
      <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-50"><Cookie className="size-5 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />Qué no hacemos</h2><p className="mt-2">No usamos cookies publicitarias ni creamos perfiles comerciales. La medición opcional registra únicamente interacciones agregadas de los artículos de ayuda y permanece desactivada hasta que la permitas; si la rechazas, el curso sigue funcionando.</p><div className="mt-4"><BotonPreferencias /></div></section>
      <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Videos de terceros</h2><p className="mt-2">Cuando una actividad contiene un video, se utiliza YouTube con modo de privacidad mejorada. Al reproducirlo, YouTube puede aplicar sus propios controles y políticas. Puedes revisar esa actividad antes de reproducir el video.</p></section>
    </MarcoLegal>
  );
}
