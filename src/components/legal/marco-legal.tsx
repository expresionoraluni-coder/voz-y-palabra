import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, BookOpenText, Cookie, Scale, ShieldCheck } from "lucide-react";
import ConsentimientoCookies from "@/components/consentimiento-cookies";

const enlaces = [
  { href: "/privacidad", etiqueta: "Privacidad", Icono: ShieldCheck },
  { href: "/terminos", etiqueta: "Términos", Icono: Scale },
  { href: "/cookies", etiqueta: "Cookies", Icono: Cookie },
];

export default function MarcoLegal({
  etiqueta,
  titulo,
  descripcion,
  children,
}: {
  etiqueta: string;
  titulo: string;
  descripcion: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-7 px-5 py-7 sm:px-7 sm:py-10">
      <Link href="/" className="inline-flex min-h-10 w-fit items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:text-indigo-200">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver a la portada
      </Link>

      <header className="relative overflow-hidden rounded-[2rem] border border-indigo-200/80 bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 p-6 text-white shadow-xl shadow-indigo-700/20 sm:p-8">
        <div aria-hidden="true" className="absolute -right-12 -top-16 size-56 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden="true" className="absolute -bottom-24 left-1/3 size-52 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-indigo-100"><BookOpenText className="size-4" aria-hidden="true" />{etiqueta}</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{titulo}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-indigo-100 sm:text-base">{descripcion}</p>
        </div>
      </header>

      <nav aria-label="Documentos de confianza" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {enlaces.map(({ href, etiqueta: texto, Icono }) => (
          <Link key={href} href={href} className="group flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:text-indigo-300">
            <Icono className="size-4 text-indigo-500 transition-transform group-hover:scale-110" aria-hidden="true" />
            {texto}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-4 text-base leading-relaxed text-slate-700 dark:text-slate-300">{children}</div>

      <footer className="border-t border-slate-200 pt-5 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">
        © 2026 Voz y Palabra. Los materiales del curso conservan los derechos de sus autoras, autores y fuentes. Estas páginas se complementan con las disposiciones institucionales aplicables al curso.
      </footer>
      <ConsentimientoCookies />
    </main>
  );
}
