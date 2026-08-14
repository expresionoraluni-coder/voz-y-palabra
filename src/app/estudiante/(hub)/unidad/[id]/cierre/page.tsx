import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import PageHeader from "@/components/ui/page-header";
import ProgressBar from "@/components/ui/progress-bar";
import UnidadCompetenciaTag from "@/components/ui/unidad-competencia-tag";
import UnidadCierre from "./unidad-cierre";
import { unidadEstaCompleta } from "@/lib/progreso-unidad";

export default async function CierreUnidadEstudiante({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingreso/estudiante");

  const { data: estudiante } = await supabase.from("estudiantes").select("id").eq("auth_user_id", user.id).single();
  if (!estudiante) redirect("/ingreso/estudiante");

  const [{ data: unidad }, { data: actividades }, { data: entregas }] = await Promise.all([
    admin
      .from("unidades")
      .select("id, nombre, orden, reto_comunicativo, unidad_competencia")
      .eq("id", id)
      .single(),
    admin.from("actividades").select("id, orden").eq("unidad_id", id).order("orden"),
    supabase.from("entregas").select("actividad_id, puntaje_auto").eq("estudiante_id", estudiante.id),
  ]);
  if (!unidad) notFound();

  if (unidad.orden > 1) {
    const { data: unidadAnterior } = await admin
      .from("unidades")
      .select("id, actividades(id, orden)")
      .eq("orden", unidad.orden - 1)
      .single();

    if (unidadAnterior) {
      const totalAnterior = unidadAnterior.actividades.length;
      const idsActividadesAnteriores = new Set(unidadAnterior.actividades.map((actividad) => actividad.id));
      const hechasAnterior = new Set(
        (entregas ?? [])
          .filter((entrega) => idsActividadesAnteriores.has(entrega.actividad_id))
          .map((entrega) => entrega.actividad_id),
      ).size;
      const { data: reflexionAnterior } = await supabase
        .from("reflexiones")
        .select("id")
        .eq("estudiante_id", estudiante.id)
        .eq("unidad_id", unidadAnterior.id)
        .eq("momento", "cierre")
        .maybeSingle();
      const ultimaActividadAnterior = unidadAnterior.actividades.slice().sort((a, b) => b.orden - a.orden)[0];
      const { data: reflexionUltimaActividadAnterior } = ultimaActividadAnterior
        ? await supabase
            .from("reflexiones")
            .select("id")
            .eq("estudiante_id", estudiante.id)
            .eq("actividad_id", ultimaActividadAnterior.id)
            .eq("momento", "cierre")
            .maybeSingle()
        : { data: null };

      if (!unidadEstaCompleta(totalAnterior, hechasAnterior) || !reflexionAnterior || !reflexionUltimaActividadAnterior) {
        redirect(`/estudiante/unidad/${unidadAnterior.id}`);
      }
    }
  }

  const listaActividades = actividades ?? [];
  const idsActividad = new Set(listaActividades.map((actividad) => actividad.id));
  const entregasUnidad = (entregas ?? []).filter((entrega) => idsActividad.has(entrega.actividad_id));
  const entregasUnicasUnidad = new Set(entregasUnidad.map((entrega) => entrega.actividad_id));
  const unidadCompleta = listaActividades.length > 0 && entregasUnicasUnidad.size === listaActividades.length;
  if (!unidadCompleta) redirect(`/estudiante/unidad/${id}`);

  const ultimaActividad = listaActividades[listaActividades.length - 1];
  const [{ data: reflexionUltimaActividad }, { data: reflexionCierre }, { data: confianzas }, { data: bitacora }, { data: unidadSiguiente }] =
    await Promise.all([
      supabase
        .from("reflexiones")
        .select("id")
        .eq("estudiante_id", estudiante.id)
        .eq("actividad_id", ultimaActividad.id)
        .eq("momento", "cierre")
        .maybeSingle(),
      supabase
        .from("reflexiones")
        .select("texto")
        .eq("estudiante_id", estudiante.id)
        .eq("unidad_id", id)
        .eq("momento", "cierre")
        .maybeSingle(),
      supabase
        .from("autoevaluaciones_confianza")
        .select("momento, valor")
        .eq("estudiante_id", estudiante.id)
        .eq("unidad_id", id),
      supabase
        .from("bitacora")
        .select("meta")
        .eq("estudiante_id", estudiante.id)
        .eq("unidad_id", id)
        .maybeSingle(),
      admin
        .from("unidades")
        .select("id, orden, nombre")
        .eq("orden", unidad.orden + 1)
        .maybeSingle(),
    ]);

  if (!reflexionUltimaActividad) {
    redirect(`/estudiante/actividad/${ultimaActividad.id}`);
  }

  const confianzaInicio = confianzas?.find((confianza) => confianza.momento === "inicio");
  const puntajesAuto = entregasUnidad
    .map((entrega) => entrega.puntaje_auto)
    .filter((puntaje): puntaje is number => puntaje != null);
  const promedioUnidad =
    puntajesAuto.length > 0
      ? Math.round(puntajesAuto.reduce((suma, puntaje) => suma + puntaje, 0) / puntajesAuto.length)
      : null;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <PageHeader
        volverHref={`/estudiante/unidad/${id}`}
        volverTexto="Volver a la unidad"
        eyebrow={`Unidad ${unidad.orden} · Cierre`}
        titulo="Haz una pausa para mirar lo que aprendiste"
        descripcion={unidad.reto_comunicativo}
      />

      <section className="overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-6 text-white shadow-lg dark:border-indigo-900">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 size-6 shrink-0 text-indigo-200" aria-hidden="true" />
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-200">Unidad terminada</p>
            <h2 className="text-xl font-semibold">Tu avance también cuenta como aprendizaje</h2>
            <p className="text-sm leading-relaxed text-indigo-100">
              Terminaste {listaActividades.length} actividades. Aquí escribirás la reflexión final de la unidad para reconocer tu proceso y elegir qué quieres llevar contigo.
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/10 px-3 py-2.5">
            <p className="text-xs text-indigo-200">Actividades</p>
            <p className="mt-1 text-lg font-semibold">{listaActividades.length}/{listaActividades.length}</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2.5">
            <p className="text-xs text-indigo-200">Promedio</p>
            <p className="mt-1 text-lg font-semibold">{promedioUnidad != null ? `${promedioUnidad}%` : "—"}</p>
          </div>
          <div className="col-span-2 rounded-2xl bg-white/10 px-3 py-2.5 sm:col-span-1">
            <p className="text-xs text-indigo-200">Confianza inicial</p>
            <p className="mt-1 text-lg font-semibold">{confianzaInicio?.valor != null ? `${confianzaInicio.valor}%` : "—"}</p>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>Recorrido completado</span>
          <span>100%</span>
        </div>
        <ProgressBar porcentaje={100} etiqueta={`Unidad ${unidad.orden}: actividades completadas`} />
      </div>

      {unidad.unidad_competencia && <UnidadCompetenciaTag texto={unidad.unidad_competencia} />}

      <UnidadCierre
        estudianteId={estudiante.id}
        unidadId={id}
        metaPrevia={bitacora?.meta ?? null}
        textoPrevio={reflexionCierre?.texto ?? null}
        confianzaInicioPct={confianzaInicio?.valor ?? null}
        promedioUnidad={promedioUnidad}
        siguienteHref={unidadSiguiente ? `/estudiante/unidad/${unidadSiguiente.id}` : "/estudiante/inicio"}
        textoSiguiente={unidadSiguiente ? `Continuar a Unidad ${unidadSiguiente.orden}: ${unidadSiguiente.nombre}` : "Volver al inicio"}
      />

      <Link
        href={`/estudiante/unidad/${id}`}
        className="inline-flex min-h-11 items-center justify-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Revisar actividades de la unidad
      </Link>
    </div>
  );
}
