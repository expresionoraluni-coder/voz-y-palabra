import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Uso y privacidad · Voz y Palabra",
  description: "Información clara sobre el uso de datos en Voz y Palabra.",
};

export default function Privacidad() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-8 px-6 py-10">
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
          Voz y Palabra usa los datos mínimos necesarios para que el curso funcione, mostrar el avance y atender problemas de acceso o actividades.
        </p>
      </header>

      <div className="flex flex-col gap-6 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Qué datos puede guardar</h2>
          <p className="mt-2">Según tu rol, pueden registrarse nombre, grupo, boleta o identificador escolar, correo de acceso docente, respuestas, reflexiones, autoevaluaciones, avance y solicitudes de ayuda.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Para qué se usan</h2>
          <p className="mt-2">Se utilizan para autenticar el acceso, mostrar las actividades correspondientes, conservar evidencias del aprendizaje, orientar a la docente y resolver incidencias técnicas. No escribas contraseñas, NIP ni datos de otras personas en una solicitud de ayuda.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Quién puede consultarlos</h2>
          <p className="mt-2">La persona estudiante consulta su propio trabajo; la docente consulta la información necesaria de sus grupos; y la cuenta administrativa atiende reportes y seguridad de la plataforma. Las respuestas y credenciales no forman parte de los reportes de soporte.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Conservación y solicitudes</h2>
          <p className="mt-2">La conservación, corrección, exportación y eliminación deben seguir la política institucional aplicable al curso. Para solicitar revisión de tus datos o reportar un uso incorrecto, comunícate con la docente o con la persona administradora de la plataforma.</p>
        </section>
        <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
          Esta página explica el funcionamiento de la plataforma en lenguaje sencillo. Debe complementarse con el aviso de privacidad y las reglas de conservación aprobadas por la institución responsable del curso.
        </aside>
      </div>
    </main>
  );
}
