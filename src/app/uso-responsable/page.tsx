import type { Metadata } from "next";
import { BrainCircuit, FileKey2, HandHeart, ScanText } from "lucide-react";
import MarcoLegal from "@/components/legal/marco-legal";

export const metadata: Metadata = {
  title: "Uso responsable e IA · Voz y Palabra",
  description: "Uso responsable de la información y de herramientas de inteligencia artificial.",
};

export default function UsoResponsable() {
  return (
    <MarcoLegal etiqueta="Aprender con criterio" titulo="Uso responsable de información e IA" descripcion="La voz propia, las fuentes y el cuidado de los datos forman parte del aprendizaje. Esta guía aclara qué se espera cuando se consulta información o se usan herramientas externas.">
      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-[1.4rem] border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/70 dark:bg-indigo-950/25"><ScanText className="size-5 text-indigo-600 dark:text-indigo-300" aria-hidden="true" /><h2 className="mt-3 font-bold text-slate-900 dark:text-slate-50">Cita y transforma</h2><p className="mt-1 text-sm leading-relaxed">Distingue tus ideas de las fuentes y explica con tus palabras lo que comprendiste.</p></article>
        <article className="rounded-[1.4rem] border border-violet-100 bg-violet-50/70 p-4 dark:border-violet-900/70 dark:bg-violet-950/25"><BrainCircuit className="size-5 text-violet-600 dark:text-violet-300" aria-hidden="true" /><h2 className="mt-3 font-bold text-slate-900 dark:text-slate-50">IA con transparencia</h2><p className="mt-1 text-sm leading-relaxed">Úsala solo cuando la docente lo permita y declara el apoyo recibido.</p></article>
        <article className="rounded-[1.4rem] border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/25"><FileKey2 className="size-5 text-emerald-600 dark:text-emerald-300" aria-hidden="true" /><h2 className="mt-3 font-bold text-slate-900 dark:text-slate-50">Cuida los datos</h2><p className="mt-1 text-sm leading-relaxed">No copies nombres, boletas, NIP ni trabajos ajenos en servicios externos.</p></article>
      </section>
      <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Información y autoría</h2><p className="mt-2">Las respuestas del curso deben mostrar tu proceso. Puedes consultar fuentes y recibir orientación, pero debes citar o señalar los apoyos que cambien de forma sustancial tu texto. No presentes como propio el trabajo de otra persona ni distribuyas las actividades, respuestas esperadas o materiales fuera del uso autorizado.</p></section>
      <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-50"><BrainCircuit className="size-5 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />Herramientas de inteligencia artificial</h2><ul className="mt-3 list-disc space-y-2 pl-5"><li>La plataforma no usa IA generativa para calificar ni para tomar decisiones escolares por sí sola.</li><li>Algunas actividades calculan resultados automáticamente con criterios definidos en el curso; esto no sustituye el juicio docente.</li><li>Si una actividad permite IA externa, úsala para explorar, comparar o mejorar, nunca para ocultar que un texto no es tuyo.</li><li>No pegues datos personales, trabajos de otras personas ni credenciales en herramientas externas.</li></ul></section>
      <section className="rounded-[1.6rem] border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900/70 dark:bg-emerald-950/25"><h2 className="flex items-center gap-2 text-lg font-bold text-emerald-950 dark:text-emerald-100"><HandHeart className="size-5" aria-hidden="true" />Si tienes duda</h2><p className="mt-2 text-emerald-900 dark:text-emerald-100">Pregunta antes de entregar. La finalidad es que la herramienta te ayude a pensar mejor, no que piense por ti.</p></section>
    </MarcoLegal>
  );
}
