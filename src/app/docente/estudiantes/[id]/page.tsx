import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resumenRespuesta } from "@/lib/resumen-respuesta";
import ComentarioEntrega from "./comentario-entrega";

export default async function FichaEstudiante({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingreso/profesora");

  const { data: estudiante } = await supabase
    .from("estudiantes")
    .select("id, nombre, grupo_id, grupos(nombre)")
    .eq("id", id)
    .single();
  if (!estudiante) notFound();

  const grupo = Array.isArray(estudiante.grupos) ? estudiante.grupos[0] : estudiante.grupos;

  const [
    { data: unidades },
    { data: entregas },
    { data: confianzas },
    { data: reflexiones },
    { data: insignias },
  ] = await Promise.all([
    supabase
      .from("unidades")
      .select("id, nombre, orden, actividades(id)")
      .order("orden"),
    supabase
      .from("entregas")
      .select("id, respuesta, estado, created_at, actividades(titulo, unidad_id, tipos_actividad(nombre))")
      .eq("estudiante_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("autoevaluaciones_confianza")
      .select("unidad_id, momento, valor")
      .eq("estudiante_id", id),
    supabase
      .from("reflexiones")
      .select("texto, created_at, actividades(titulo)")
      .eq("estudiante_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("insignias_otorgadas")
      .select("insignias(nombre)")
      .eq("estudiante_id", id),
  ]);

  const totalActividades = unidades?.reduce((s, u) => s + u.actividades.length, 0) ?? 0;
  const avanceGeneral = totalActividades > 0 ? Math.round(((entregas?.length ?? 0) / totalActividades) * 100) : 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 bg-white px-6 py-10 dark:bg-black">
      <div>
        <Link href={`/docente/grupos/${estudiante.grupo_id}`} className="text-sm text-zinc-500 underline dark:text-zinc-400">
          ← {grupo?.nombre}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {estudiante.nombre}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          Avance general: {avanceGeneral}% · {entregas?.length ?? 0}/{totalActividades} actividades
        </p>
      </div>

      {insignias && insignias.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {insignias.map((i, idx) => {
            const ins = Array.isArray(i.insignias) ? i.insignias[0] : i.insignias;
            return (
              <span
                key={idx}
                className="rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
              >
                {ins?.nombre}
              </span>
            );
          })}
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Avance y confianza por unidad</h2>
        {unidades?.map((u) => {
          const hechas = entregas?.filter((en) => {
            const act = Array.isArray(en.actividades) ? en.actividades[0] : en.actividades;
            return act?.unidad_id === u.id;
          }).length ?? 0;
          const pct = u.actividades.length > 0 ? Math.round((hechas / u.actividades.length) * 100) : 0;
          const inicio = confianzas?.find((c) => c.unidad_id === u.id && c.momento === "inicio");
          const cierre = confianzas?.find((c) => c.unidad_id === u.id && c.momento === "cierre");
          return (
            <div key={u.id}>
              <div className="mb-1 flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
                <span>Unidad {u.orden}. {u.nombre}</span>
                <span>{pct}% avance</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-900">
                <div className="h-2 rounded-full bg-zinc-900 dark:bg-zinc-50" style={{ width: `${pct}%` }} />
              </div>
              {inicio && (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                  confianza: {inicio.valor}% al inicio {cierre ? `→ ${cierre.valor}% al cierre` : "(sin cierre aún)"}
                </p>
              )}
            </div>
          );
        })}
      </section>

      {reflexiones && reflexiones.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Reflexiones recientes</h2>
          {reflexiones.map((r, i) => {
            const act = Array.isArray(r.actividades) ? r.actividades[0] : r.actividades;
            return (
              <div key={i} className="rounded-lg border border-zinc-200 px-4 py-2 dark:border-zinc-800">
                <p className="text-xs text-zinc-500 dark:text-zinc-500">{act?.titulo}</p>
                <p className="text-sm text-zinc-800 dark:text-zinc-200">{r.texto}</p>
              </div>
            );
          })}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Entregas</h2>
        {!entregas || entregas.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-500">Todavía no hay entregas.</p>
        ) : (
          entregas.map((en) => {
            const act = Array.isArray(en.actividades) ? en.actividades[0] : en.actividades;
            const tipo = act ? (Array.isArray(act.tipos_actividad) ? act.tipos_actividad[0] : act.tipos_actividad) : undefined;
            return (
              <div key={en.id} className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">{act?.titulo}</p>
                  {en.estado === "pendiente_revision" && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Por revisar
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {resumenRespuesta(tipo?.nombre, en.respuesta ?? {})}
                </p>
                <ComentarioEntrega entregaId={en.id} pendienteRevision={en.estado === "pendiente_revision"} />
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
