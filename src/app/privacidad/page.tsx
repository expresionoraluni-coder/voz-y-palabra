import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpen, Database, MessageCircle, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Uso y privacidad · Voz y Palabra",
  description: "Información clara sobre el uso de datos en Voz y Palabra.",
};

export default function Privacidad() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-7 px-6 py-10">
      <Link href="/" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:text-slate-50">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver a la portada
      </Link>

      <header className="flex flex-col gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
          <ShieldCheck className="size-6" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Información para la comunidad</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Uso y privacidad</h1>
        <p className="max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-400">
          Voz y Palabra usa los datos mínimos necesarios para que el curso funcione, mostrar el avance y atender problemas de acceso o actividades. La docente responsable del curso y primer punto de contacto es M. en C. Monserrat Nieto Cuevas.
        </p>
      </header>

      <section aria-label="En breve" className="grid gap-3 sm:grid-cols-3">
        <Card className="flex flex-col gap-2 border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900 dark:bg-indigo-950/25">
          <Database className="size-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Datos para el curso</p>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">Solo se guardan los datos necesarios para acceder, aprender y dar seguimiento.</p>
        </Card>
        <Card className="flex flex-col gap-2 p-4">
          <BookOpen className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Uso educativo</p>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">Tus respuestas y avance se usan para acompañar tu aprendizaje.</p>
        </Card>
        <Card className="flex flex-col gap-2 p-4">
          <MessageCircle className="size-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Pide revisión</p>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">Puedes solicitar apoyo o informar un uso incorrecto por el canal del curso.</p>
        </Card>
      </section>

      <nav aria-label="Secciones de privacidad" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 text-sm">
        {[
          ["#datos", "Datos"],
          ["#uso", "Uso"],
          ["#borradores", "Borradores"],
          ["#acceso", "Acceso"],
          ["#solicitudes", "Solicitudes"],
        ].map(([href, etiqueta]) => (
          <a key={href} href={href} className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-indigo-200 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:text-indigo-300">
            {etiqueta}
          </a>
        ))}
      </nav>

      <div className="flex flex-col gap-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        <section id="datos" className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Qué datos puede guardar</h2>
          <p className="mt-2">Según tu rol, pueden registrarse nombre, grupo, boleta o identificador escolar, correo de acceso docente, respuestas, reflexiones, autoevaluaciones, avance y solicitudes de ayuda.</p>
        </section>
        <section id="uso" className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Para qué se usan</h2>
          <p className="mt-2">Se utilizan con fines educativos: autenticar el acceso, mostrar las actividades correspondientes, conservar evidencias del aprendizaje, orientar a la docente y resolver incidencias técnicas. También pueden analizarse de forma agregada o anonimizada para investigación pedagógica y mejora del curso; no se usarán nombres, identificadores ni respuestas atribuibles para ese fin sin la autorización institucional y, cuando corresponda, las autorizaciones aplicables. No escribas contraseñas, NIP ni datos de otras personas en una solicitud de ayuda.</p>
        </section>
        <section id="borradores" className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Borradores antes de entregar</h2>
          <p className="mt-2">Antes de entregar una respuesta abierta, la plataforma puede guardar un borrador solo en el navegador y dispositivo que estás usando. Ese borrador no se envía a la base de datos, no se califica y se elimina al guardar la entrega o cerrar sesión. Si usas un equipo compartido, cierra sesión al terminar.</p>
        </section>
        <section id="acceso" className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Quién puede consultarlos</h2>
          <p className="mt-2">La persona estudiante consulta su propio trabajo; la docente consulta la información necesaria de sus grupos; y la cuenta administrativa atiende reportes y seguridad de la plataforma. Las respuestas y credenciales no forman parte de los reportes de soporte.</p>
        </section>
        <section id="solicitudes" className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Conservación y solicitudes</h2>
          <p className="mt-2">La conservación, corrección, exportación y eliminación deben seguir la política institucional aplicable al curso. Para solicitar revisión de tus datos o reportar un uso incorrecto, comunícate con M. en C. Monserrat Nieto Cuevas por el canal institucional del curso o con la persona administradora de la plataforma.</p>
        </section>
        <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
          Esta página explica el funcionamiento de la plataforma en lenguaje sencillo. Debe complementarse con el aviso de privacidad y las reglas de conservación aprobadas por la institución responsable del curso.
        </aside>
      </div>
    </main>
  );
}
