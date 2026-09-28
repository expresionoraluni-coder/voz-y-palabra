import type { Metadata } from "next";
import { BarChart3, Database, Eye, GraduationCap, ShieldCheck, UsersRound } from "lucide-react";
import MarcoLegal from "@/components/legal/marco-legal";

export const metadata: Metadata = {
  title: "Privacidad y datos · Voz y Palabra",
  description: "Cómo Voz y Palabra protege y utiliza la información del curso.",
};

const servicios = [
  ["Supabase", "Autenticación, sesiones y base de datos del curso."],
  ["Netlify", "Alojamiento, entrega segura del sitio y registros técnicos necesarios para operar."],
  ["YouTube con modo de privacidad mejorada", "Reproducción de videos cuando una actividad los incluye."],
  ["Google Gmail", "Notificaciones operativas de reportes cuando la cuenta institucional lo requiere."],
] as const;

export default function Privacidad() {
  return (
    <MarcoLegal
      etiqueta="Centro de confianza"
      titulo="Tus datos tienen un propósito educativo"
      descripcion="Esta plataforma usa la información mínima para que puedas entrar, practicar, recibir orientación y consultar tu avance. No vende datos ni usa publicidad dirigida."
    >
      <section className="grid gap-3 sm:grid-cols-3" aria-label="En breve">
        <article className="rounded-[1.45rem] border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900/70 dark:bg-indigo-950/25"><Database className="size-5 text-indigo-600 dark:text-indigo-300" aria-hidden="true" /><h2 className="mt-3 font-bold text-slate-900 dark:text-slate-50">Lo necesario</h2><p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">Acceso, grupo, entregas, avance y solicitudes de ayuda.</p></article>
        <article className="rounded-[1.45rem] border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/25"><GraduationCap className="size-5 text-emerald-600 dark:text-emerald-300" aria-hidden="true" /><h2 className="mt-3 font-bold text-slate-900 dark:text-slate-50">Para aprender</h2><p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">La docente usa la información para acompañar el proceso del grupo.</p></article>
        <article className="rounded-[1.45rem] border border-violet-100 bg-violet-50/70 p-4 dark:border-violet-900/70 dark:bg-violet-950/25"><ShieldCheck className="size-5 text-violet-600 dark:text-violet-300" aria-hidden="true" /><h2 className="mt-3 font-bold text-slate-900 dark:text-slate-50">Sin venta ni publicidad</h2><p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">No hay anuncios ni perfiles comerciales de estudiantes.</p></article>
      </section>

      <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-50"><Eye className="size-5 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />Qué información puede registrarse</h2>
        <p className="mt-2">Según tu perfil, la plataforma puede guardar nombre, grupo, identificador escolar o boleta, correo docente, respuestas, reflexiones, autoevaluaciones, avance y solicitudes de ayuda. Las credenciales se tratan como información de acceso y nunca deben escribirse en las respuestas ni en los reportes.</p>
      </section>

      <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-50"><BarChart3 className="size-5 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />Seguimiento educativo y medición de uso</h2>
        <p className="mt-2">El avance, las entregas y la retroalimentación se registran con fines educativos porque son necesarios para el curso. La docente ve la información de sus grupos y la cuenta administrativa atiende seguridad y soporte. Las comparativas pedagógicas excluyen el grupo de revisión.</p>
        <p className="mt-2">Los datos también pueden analizarse de manera agregada o anonimizada para investigación pedagógica y mejora del curso. No se utilizan nombres, identificadores ni respuestas atribuibles para ese fin sin la autorización institucional y las autorizaciones aplicables.</p>
        <p className="mt-2">La medición opcional de uso sirve para saber si la ayuda dentro de la plataforma funciona. Se desactiva por defecto hasta que la persona usuaria la permita; no usa publicidad ni comparte respuestas académicas con servicios de analítica.</p>
      </section>

      <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Borradores antes de entregar</h2>
        <p className="mt-2">Antes de guardar una respuesta abierta, la plataforma puede conservar un borrador únicamente en el navegador y dispositivo que estás usando. Ese borrador no se envía a la base de datos, no se califica y se elimina al guardar la entrega o cerrar sesión. Si usas un equipo compartido, cierra sesión al terminar.</p>
      </section>

      <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-50"><UsersRound className="size-5 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />Terceros que pueden intervenir</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {servicios.map(([nombre, funcion]) => <li key={nombre} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/40"><strong className="block text-slate-900 dark:text-slate-50">{nombre}</strong><span className="mt-0.5 block text-xs leading-relaxed text-slate-600 dark:text-slate-400">{funcion}</span></li>)}
        </ul>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">No hay servicios publicitarios ni de venta de información. Los videos solo cargan el servicio de YouTube cuando una actividad lo necesita.</p>
      </section>

      <section className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Conservación, acceso y solicitudes</h2>
        <p className="mt-2">La información se conserva conforme a las reglas institucionales del curso. Puedes pedir que se revise o corrija tu información por el canal institucional del curso. La docente responsable y primer punto de contacto es M. en C. Monserrat Nieto Cuevas.</p>
      </section>
    </MarcoLegal>
  );
}
