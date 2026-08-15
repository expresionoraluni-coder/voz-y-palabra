import Link from "next/link";
import { ArrowLeft, CheckCheck, HelpCircle, Lightbulb, Mic2, PenLine, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireEstudiante } from "@/lib/requerir-estudiante";
import PageHeader from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import RestablecerGuia from "../restablecer-guia";

const RECURSOS = [
  {
    titulo: "Para escribir mejor",
    descripcion: "Ideas sencillas para ordenar y revisar tus textos.",
    icon: PenLine,
    color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400",
    puntos: ["Resume la idea principal con tus propias palabras", "Separa ideas principales de ejemplos", "Revisa ortografía y puntuación antes de entregar"],
  },
  {
    titulo: "Para expresarte oralmente",
    descripcion: "Una guía breve para hablar con claridad y seguridad.",
    icon: Mic2,
    color: "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
    puntos: ["Organiza lo que quieres decir antes de empezar", "Habla con un ritmo que puedas controlar", "Haz pausas para respirar y enfatizar tus ideas"],
  },
  {
    titulo: "Cómo estudiar una actividad",
    descripcion: "Un ciclo corto para aprovechar mejor cada práctica.",
    icon: CheckCheck,
    color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
    puntos: ["Lee qué tienes que lograr", "Intenta resolver antes de pedir una pista", "Revisa el resultado y escribe qué aprendiste"],
  },
  {
    titulo: "Si necesitas ayuda",
    descripcion: "Pedir apoyo también forma parte de aprender.",
    icon: HelpCircle,
    color: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
    puntos: ["Vuelve a leer la instrucción y el ejemplo", "Usa la pista si la actividad la tiene", "Escribe en tu bitácora qué parte te costó y vuelve a intentarlo"],
  },
  {
    titulo: "Cuida tus datos",
    descripcion: "Pequeños hábitos para estudiar con seguridad.",
    icon: ShieldCheck,
    color: "bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400",
    puntos: ["No compartas tu código de grupo ni tu NIP", "Cierra sesión si usas un equipo compartido", "No escribas datos personales que no necesite la actividad"],
  },
];

export default async function RecursosEstudiante() {
  const supabase = await createClient();
  const estudiante = await requireEstudiante<{ id: string }>(supabase, "id");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <PageHeader
        volverHref="/estudiante/inicio"
        eyebrow="Herramientas para tu curso"
        titulo="Recursos para aprender"
        descripcion="Ideas breves que puedes consultar cuando quieras estudiar, escribir o preparar una exposición."
      />

      <div className="flex flex-col gap-3">
        {RECURSOS.map(({ titulo, descripcion, icon: Icon, color, puntos }) => (
          <Card key={titulo} className="flex flex-col gap-4 p-5">
            <div className="flex items-start gap-3">
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">{titulo}</h2>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{descripcion}</p>
              </div>
            </div>
            <ul className="flex flex-col gap-2 text-sm text-slate-700 dark:text-slate-300">
              {puntos.map((punto) => (
                <li key={punto} className="flex items-start gap-2">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden="true" />
                  <span>{punto}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Link
        href="/estudiante/inicio"
        className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-lg text-sm font-medium text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-400"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver a mi inicio
      </Link>
      <RestablecerGuia estudianteId={estudiante.id} />
    </div>
  );
}
