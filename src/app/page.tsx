import Link from "next/link";
import { ArrowRight, BookOpen, Compass, Mic2, ShieldCheck, Sparkles } from "lucide-react";
import MarcaVozPalabra from "@/components/ui/marca-voz-palabra";
import ConsentimientoCookies from "@/components/consentimiento-cookies";

const momentos = [
  { titulo: "Ubica tu punto de partida", texto: "Entra con tu perfil y encuentra tu ruta personal.", Icono: Compass, tono: "from-cyan-400 to-indigo-500" },
  { titulo: "Practica con intención", texto: "Lee, escribe, compara y prueba ideas en actividades breves.", Icono: Mic2, tono: "from-violet-500 to-fuchsia-500" },
  { titulo: "Mira cómo avanzas", texto: "Conserva evidencias y reconoce qué estrategia te sirve.", Icono: BookOpen, tono: "from-emerald-400 to-teal-500" },
];

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-1 flex-col overflow-hidden bg-slate-950 px-5 py-6 text-white sm:px-8 sm:py-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_8%,rgba(129,140,248,0.36),transparent_28rem),radial-gradient(circle_at_92%_24%,rgba(34,211,238,0.18),transparent_25rem),linear-gradient(145deg,#0f172a_0%,#312e81_52%,#4c1d95_100%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.09] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:28px_28px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-1/2 size-80 -translate-y-1/2 rounded-full bg-fuchsia-500/15 blur-3xl" />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <MarcaVozPalabra compacta />
        <Link href="/privacidad" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-semibold text-indigo-100 backdrop-blur-sm transition hover:border-white/30 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Privacidad
        </Link>
      </header>

      <section className="relative mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 py-10 lg:grid-cols-[1.08fr_0.92fr] lg:py-14" aria-labelledby="inicio-titulo">
        <div className="max-w-2xl">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-indigo-200"><Sparkles className="size-4" aria-hidden="true" />Expresión Oral y Escrita I</p>
          <h1 id="inicio-titulo" className="mt-4 text-5xl font-extrabold leading-[0.96] tracking-tight text-white sm:text-7xl">Voz y<br /><span className="bg-gradient-to-r from-cyan-200 via-indigo-100 to-fuchsia-200 bg-clip-text text-transparent">Palabra.</span></h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-indigo-100 sm:text-lg">Un espacio para ensayar ideas, hacerlas claras y reconocer cómo mejora tu forma de comunicarte.</p>

          <div className="mt-7 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link href="/ingreso" className="inline-flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-extrabold text-slate-900 shadow-xl shadow-indigo-950/40 transition hover:-translate-y-0.5 hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-950 active:scale-[0.98]">
              Acceder al curso <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <p className="text-sm text-indigo-100/80">Estudiantes y profesoras entran desde aquí.</p>
          </div>

          <div className="mt-8 flex flex-wrap gap-2 text-xs font-semibold text-indigo-100">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-sm">3 unidades de aprendizaje</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-sm">Tu ritmo, tu portafolio</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-sm">Ayuda cuando la necesitas</span>
          </div>
        </div>

        <div className="relative rounded-[2rem] border border-white/20 bg-white/[0.11] p-4 shadow-2xl shadow-slate-950/35 backdrop-blur-xl sm:p-5">
          <div aria-hidden="true" className="absolute -right-8 -top-8 size-28 rounded-full bg-cyan-300/20 blur-2xl" />
          <div className="relative flex items-center justify-between gap-4 border-b border-white/15 pb-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-200">Tu recorrido</p><h2 className="mt-1 text-xl font-bold">De una idea a una voz propia</h2></div>
            <span className="flex size-10 items-center justify-center rounded-2xl bg-white/10"><Sparkles className="size-5 text-cyan-200" aria-hidden="true" /></span>
          </div>
          <ol className="relative mt-4 flex flex-col gap-3">
            {momentos.map(({ titulo, texto, Icono, tono }, indice) => (
              <li key={titulo} className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/20 p-3 transition hover:-translate-x-1 hover:bg-white/10">
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tono} text-white shadow-lg`}><Icono className="size-5" aria-hidden="true" /></span>
                <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-wide text-indigo-200">Paso {indice + 1}</p><h3 className="mt-0.5 text-sm font-bold text-white">{titulo}</h3><p className="mt-0.5 text-xs leading-relaxed text-indigo-100/80">{texto}</p></div>
                <span className="text-lg font-extrabold text-white/25" aria-hidden="true">0{indice + 1}</span>
              </li>
            ))}
          </ol>
          <p className="relative mt-4 rounded-xl border border-cyan-200/20 bg-cyan-300/10 px-3 py-2 text-xs leading-relaxed text-cyan-50">Primera vez: entra, selecciona tu perfil y sigue las indicaciones de acceso. No necesitas memorizar todo antes de empezar.</p>
        </div>
      </section>

      <footer className="relative mx-auto flex w-full max-w-6xl flex-col gap-2 border-t border-white/10 pt-4 text-xs text-indigo-100/75 sm:flex-row sm:items-center sm:justify-between">
        <span>CECyT 1 “Gonzalo Vázquez Vela” · IPN</span>
        <nav aria-label="Información legal" className="flex flex-wrap gap-x-3 gap-y-1">
          <Link href="/privacidad" className="underline underline-offset-2 hover:text-white">Privacidad</Link>
          <Link href="/terminos" className="underline underline-offset-2 hover:text-white">Términos</Link>
          <Link href="/cookies" className="underline underline-offset-2 hover:text-white">Cookies</Link>
        </nav>
      </footer>
      <ConsentimientoCookies />
    </main>
  );
}
