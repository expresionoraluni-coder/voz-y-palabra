import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resumenRespuesta } from "@/lib/resumen-respuesta";
import BotonImprimir from "./boton-imprimir";

export default async function Portafolio() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingreso/estudiante");

  const { data: estudiante } = await supabase
    .from("estudiantes")
    .select("id, nombre, grupos(nombre)")
    .eq("auth_user_id", user.id)
    .single();
  if (!estudiante) redirect("/ingreso/estudiante");

  const grupo = Array.isArray(estudiante.grupos) ? estudiante.grupos[0] : estudiante.grupos;

  const { data: unidades } = await supabase
    .from("unidades")
    .select(
      `id, nombre, orden,
       actividades(id, titulo, tipos_actividad(nombre),
         entregas(respuesta, created_at),
         reflexiones(texto)
       )`,
    )
    .order("orden");

  const { data: confianzas } = await supabase
    .from("autoevaluaciones_confianza")
    .select("unidad_id, momento, valor")
    .eq("estudiante_id", estudiante.id);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 bg-white px-6 py-10 print:px-0 dark:bg-black">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/estudiante/inicio" className="text-sm text-zinc-500 underline dark:text-zinc-400">
          ← Volver
        </Link>
        <BotonImprimir />
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Portafolio de {estudiante.nombre}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          Grupo: {grupo?.nombre ?? "—"}
        </p>
      </div>

      {unidades?.map((u) => {
        const confInicio = confianzas?.find((c) => c.unidad_id === u.id && c.momento === "inicio");
        const confCierre = confianzas?.find((c) => c.unidad_id === u.id && c.momento === "cierre");
        const actividadesCompletadas = u.actividades.filter(
          (a) => Array.isArray(a.entregas) && a.entregas.length > 0,
        );

        if (actividadesCompletadas.length === 0 && !confInicio) return null;

        return (
          <section key={u.id} className="flex flex-col gap-3 break-inside-avoid">
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
              Unidad {u.orden}. {u.nombre}
            </h2>
            {confInicio && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Confianza: {confInicio.valor}%{confCierre ? ` → ${confCierre.valor}%` : " (unidad en curso)"}
              </p>
            )}
            {actividadesCompletadas.map((a) => {
              const tipo = Array.isArray(a.tipos_actividad) ? a.tipos_actividad[0] : a.tipos_actividad;
              const entrega = Array.isArray(a.entregas) ? a.entregas[0] : a.entregas;
              const reflexion = Array.isArray(a.reflexiones) ? a.reflexiones[0] : a.reflexiones;
              return (
                <div key={a.id} className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">{a.titulo}</p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {resumenRespuesta(tipo?.nombre, entrega?.respuesta ?? {})}
                  </p>
                  {reflexion?.texto && (
                    <p className="mt-2 text-sm italic text-zinc-500 dark:text-zinc-500">
                      Reflexión: {reflexion.texto}
                    </p>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
