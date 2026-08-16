import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ExternalLink, Pencil, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { esVideoUrlPermitida, urlEmbedYoutube } from "@/lib/video-embed";
import { etiquetaTipo } from "@/lib/tipo-actividad-icono";

export default async function VistaActividadDocente({
  params,
}: {
  params: Promise<{ id: string; actividadId: string }>;
}) {
  const { id: unidadId, actividadId } = await params;
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data: actividad },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("actividades")
      .select("id, unidad_id, orden, titulo, instrucciones, aprendizaje_esperado, video_url, tipos_actividad(nombre), unidades(nombre, orden)")
      .eq("id", actividadId)
      .eq("unidad_id", unidadId)
      .single(),
  ]);

  if (!user) redirect("/ingreso/profesora");
  if (!actividad) notFound();

  const tipo = Array.isArray(actividad.tipos_actividad) ? actividad.tipos_actividad[0] : actividad.tipos_actividad;
  const unidad = Array.isArray(actividad.unidades) ? actividad.unidades[0] : actividad.unidades;
  const videoSeguro = actividad.video_url && esVideoUrlPermitida(actividad.video_url) ? actividad.video_url : null;
  const videoEmbed = videoSeguro ? urlEmbedYoutube(videoSeguro) : null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <PageHeader
        volverHref={`/docente/unidades/${unidadId}`}
        volverTexto={`Unidad ${unidad?.orden ?? ""}`}
        eyebrow={`Actividad ${actividad.orden} · ${etiquetaTipo(tipo?.nombre)}`}
        titulo={actividad.titulo}
        descripcion="Vista de consulta. Puedes modificar esta actividad cuando sea necesario."
        accion={
          <Link
            href={`/docente/unidades/${unidadId}/actividades/${actividadId}/editar`}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
          >
            <Pencil className="size-4" aria-hidden="true" />
            Editar actividad
          </Link>
        }
      />

      {actividad.aprendizaje_esperado && (
        <Card className="border-indigo-100 bg-indigo-50/60 p-5 dark:border-indigo-900 dark:bg-indigo-950/30">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Aprendizaje esperado</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{actividad.aprendizaje_esperado}</p>
        </Card>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="instrucciones-actividad">
        <h2 id="instrucciones-actividad" className="text-lg font-semibold text-slate-900 dark:text-slate-50">Instrucciones</h2>
        <Card className="p-5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">{actividad.instrucciones || "Esta actividad no tiene instrucciones adicionales."}</p>
        </Card>
      </section>

      {videoSeguro && (
        <section className="flex flex-col gap-3" aria-labelledby="video-actividad">
          <h2 id="video-actividad" className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
            <Video className="size-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            Video de apoyo
          </h2>
          <Card className="p-4">
            {videoEmbed ? (
              <div className="aspect-video w-full overflow-hidden rounded-xl bg-slate-900">
                <iframe
                  src={videoEmbed}
                  title={`Video de apoyo: ${actividad.titulo}`}
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="size-full"
                />
              </div>
            ) : (
              <a href={videoSeguro} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                <ExternalLink className="size-4" aria-hidden="true" />
                Abrir video en YouTube
              </a>
            )}
          </Card>
        </section>
      )}

      <Link href={`/docente/unidades/${unidadId}`} className="inline-flex min-h-11 w-fit items-center rounded-lg px-1 text-sm font-medium text-indigo-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-400">
        Volver a las actividades
      </Link>
    </div>
  );
}
