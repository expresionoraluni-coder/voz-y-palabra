import type { Metadata } from "next";
import { BadgeCheck, BookOpen, LockKeyhole, Scale } from "lucide-react";
import MarcoLegal from "@/components/legal/marco-legal";

export const metadata: Metadata = {
  title: "Términos de uso · Voz y Palabra",
  description: "Reglas claras para utilizar Voz y Palabra con fines educativos.",
};

export default function Terminos() {
  return (
    <MarcoLegal etiqueta="Reglas del espacio" titulo="Términos de uso" descripcion="Voz y Palabra es un espacio educativo para practicar Expresión Oral y Escrita I. Estas reglas cuidan el trabajo propio, el acceso de cada persona y la convivencia del grupo.">
      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-[1.4rem] border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/70 dark:bg-indigo-950/25"><BookOpen className="size-5 text-indigo-600 dark:text-indigo-300" aria-hidden="true" /><h2 className="mt-3 font-bold text-slate-900 dark:text-slate-50">Uso educativo</h2><p className="mt-1 text-sm leading-relaxed">Usa las actividades para aprender y conservar evidencias de tu propio proceso.</p></article>
        <article className="rounded-[1.4rem] border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/25"><BadgeCheck className="size-5 text-emerald-600 dark:text-emerald-300" aria-hidden="true" /><h2 className="mt-3 font-bold text-slate-900 dark:text-slate-50">Trabajo auténtico</h2><p className="mt-1 text-sm leading-relaxed">Entrega ideas propias y cita las fuentes o apoyos que correspondan.</p></article>
        <article className="rounded-[1.4rem] border border-violet-100 bg-violet-50/70 p-4 dark:border-violet-900/70 dark:bg-violet-950/25"><LockKeyhole className="size-5 text-violet-600 dark:text-violet-300" aria-hidden="true" /><h2 className="mt-3 font-bold text-slate-900 dark:text-slate-50">Acceso personal</h2><p className="mt-1 text-sm leading-relaxed">No compartas tu NIP, código de grupo ni sesión con otra persona.</p></article>
      </section>
      <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Compromisos al usar la plataforma</h2><ul className="mt-3 list-disc space-y-2 pl-5"><li>Usar únicamente tu cuenta y la información de tu grupo.</li><li>No intentar acceder a información, respuestas, calificaciones o cuentas ajenas.</li><li>No publicar contenido ofensivo, datos personales de otras personas ni archivos que afecten el funcionamiento del sitio.</li><li>Reportar errores o dificultades desde Ayuda, sin incluir contraseñas, NIP ni datos de otras personas.</li></ul></section>
      <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-50"><Scale className="size-5 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />Evaluación y disponibilidad</h2><p className="mt-2">Algunas actividades muestran un resultado automático a partir de criterios definidos por la docente. La retroalimentación, el acompañamiento y las decisiones académicas siguen siendo responsabilidad de la docente y de las reglas institucionales aplicables.</p><p className="mt-2">La plataforma puede actualizarse para corregir errores o mejorar la experiencia. Cuando un cambio afecte de forma importante al curso, se comunicará por el canal correspondiente.</p></section>
    </MarcoLegal>
  );
}
