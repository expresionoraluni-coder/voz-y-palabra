import { BookOpen } from "lucide-react";
import { requerirAdministrador } from "@/lib/supabase/requerir-administrador";
import { revisarErrorConsulta } from "@/lib/revisar-error-consulta";
import { Card } from "@/components/ui/card";
import GestionFaq from "./gestion-faq";

export default async function AdminFaqPage() {
  const { supabase } = await requerirAdministrador();
  const { data, error } = await supabase
    .from("faq_articulos")
    .select("id, audiencia, categoria, titulo, resumen, pasos, activo")
    .order("orden", { ascending: true });
  revisarErrorConsulta(error, "No pudimos cargar los artículos de ayuda.");

  const articulos = (data ?? []).map((articulo) => ({
    id: articulo.id,
    audiencia: articulo.audiencia,
    categoria: articulo.categoria,
    titulo: articulo.titulo,
    resumen: articulo.resumen,
    pasos: Array.isArray(articulo.pasos) ? articulo.pasos.filter((paso): paso is string => typeof paso === "string") : [],
    activo: articulo.activo,
  }));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Autoservicio</p>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50"><BookOpen className="size-6 text-indigo-600 dark:text-indigo-400" aria-hidden="true" /> Artículos de ayuda</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">Edita las orientaciones que aparecen antes de crear un reporte. Mantén los pasos breves y accionables; las preguntas diagnósticas se conservan para no perder la clasificación automática.</p>
      </section>
      {articulos.length === 0 ? <Card className="p-5 text-sm text-slate-600 dark:text-slate-400">Todavía no hay artículos de ayuda configurados.</Card> : <GestionFaq articulos={articulos} />}
    </div>
  );
}
