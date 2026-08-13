import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, CheckCircle2, ChevronRight, ClipboardCheck, LifeBuoy, Plus, Sparkles, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import CerrarSesion from "@/components/cerrar-sesion";
import Avatar from "@/components/ui/avatar";
import { Card, CardLink } from "@/components/ui/card";
import Badge from "@/components/ui/badge";
import Boton from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import MetricCard from "@/components/ui/metric-card";
import { temaUnidad } from "@/lib/unidad-tema";

export default async function DashboardDocente() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/ingreso/profesora");

  const [{ data: docente }, { data: grupos }, { data: unidades }, { data: actividades }, { data: entregasPorRevisar }] =
    await Promise.all([
      supabase.from("docentes").select("nombre").eq("id", user.id).single(),
      supabase
        .from("grupos")
        .select("id, nombre, codigo_acceso, estudiantes(count)")
        .eq("docente_id", user.id)
        .eq("estudiantes.activo", true)
        .order("created_at", { ascending: false }),
      supabase.from("unidades").select("id, nombre, orden, reto_comunicativo").order("orden"),
      supabase.from("actividades").select("id, unidad_id"),
      supabase.from("entregas").select("estudiantes(grupo_id)").eq("estado", "pendiente_revision"),
    ]);

  if (!docente) redirect("/ingreso/profesora/verificar");

  const porRevisarPorGrupo = new Map<string, number>();
  for (const en of entregasPorRevisar ?? []) {
    const est = Array.isArray(en.estudiantes) ? en.estudiantes[0] : en.estudiantes;
    if (!est?.grupo_id) continue;
    porRevisarPorGrupo.set(est.grupo_id, (porRevisarPorGrupo.get(est.grupo_id) ?? 0) + 1);
  }

  const totalEstudiantes = (grupos ?? []).reduce((total, grupo) => {
    const relacion = Array.isArray(grupo.estudiantes) ? grupo.estudiantes[0] : grupo.estudiantes;
    return total + (relacion?.count ?? 0);
  }, 0);
  const actividadesPorUnidad = new Map<string, number>();
  for (const actividad of actividades ?? []) {
    actividadesPorUnidad.set(actividad.unidad_id, (actividadesPorUnidad.get(actividad.unidad_id) ?? 0) + 1);
  }
  const grupoSinEstudiantes = (grupos ?? []).find((grupo) => {
    const relacion = Array.isArray(grupo.estudiantes) ? grupo.estudiantes[0] : grupo.estudiantes;
    return (relacion?.count ?? 0) === 0;
  });
  const gruposConAtencion = (grupos ?? []).filter((grupo) => (porRevisarPorGrupo.get(grupo.id) ?? 0) > 0);
  const totalCasosApoyo = [...porRevisarPorGrupo.values()].reduce((total, cantidad) => total + cantidad, 0);
  const primeraUnidad = unidades?.[0];
  const siguientePaso = !grupos?.length
    ? {
        titulo: "Crea tu primer grupo",
        descripcion: "Después podrás compartir un código de acceso y comenzar a trabajar.",
        href: "/docente/grupos/nuevo",
        accion: "Crear grupo",
      }
    : grupoSinEstudiantes
      ? {
          titulo: `Agrega estudiantes a ${grupoSinEstudiantes.nombre}`,
          descripcion: "Puedes capturarlos uno por uno o pegar una lista copiada de Excel para ahorrar tiempo.",
          href: `/docente/grupos/${grupoSinEstudiantes.id}`,
          accion: "Abrir grupo",
        }
      : !actividades?.length && primeraUnidad
        ? {
            titulo: "Prepara la primera actividad",
            descripcion: `Empieza con ${primeraUnidad.nombre} y usa una dinámica lista para configurar.`,
            href: `/docente/unidades/${primeraUnidad.id}/actividades/nueva`,
            accion: "Crear actividad",
          }
        : {
            titulo: "Revisa el avance de tus grupos",
            descripcion: "Consulta quién ya practicó, qué necesita atención y qué contenido sigue.",
            href: `/docente/grupos/${grupos[0].id}`,
            accion: "Ver grupo",
        };
  const grupoPrincipal = gruposConAtencion[0] ?? grupos?.[0];
  const accionGrupo = !grupos?.length
    ? { titulo: "Crear un grupo", descripcion: "Genera el código para que puedan entrar.", href: "/docente/grupos/nuevo" }
    : grupoSinEstudiantes
      ? { titulo: "Agregar estudiantes", descripcion: `Completa ${grupoSinEstudiantes.nombre}.`, href: `/docente/grupos/${grupoSinEstudiantes.id}` }
      : { titulo: "Abrir un grupo", descripcion: "Consulta el avance y los accesos.", href: `/docente/grupos/${grupoPrincipal?.id ?? ""}` };
  const accionContenido = primeraUnidad
    ? !actividades?.length
      ? { titulo: "Preparar contenido", descripcion: `Empieza por ${primeraUnidad.nombre}.`, href: `/docente/unidades/${primeraUnidad.id}/actividades/nueva` }
      : { titulo: "Ver unidades", descripcion: "Consulta el material disponible.", href: `/docente/unidades/${primeraUnidad.id}` }
    : { titulo: "Ver unidades", descripcion: "Consulta el material del curso.", href: "/docente/dashboard#unidades" };
  const accionSeguimiento = grupoPrincipal
    ? gruposConAtencion.length > 0
      ? { titulo: "Revisar apoyo", descripcion: "Mira los casos que esperan orientación.", href: `/docente/grupos/${grupoPrincipal.id}#apoyo` }
      : { titulo: "Ver avance", descripcion: "Identifica quién ya comenzó.", href: `/docente/grupos/${grupoPrincipal.id}#resumen` }
    : { titulo: "Conocer el flujo", descripcion: "Crea un grupo para comenzar.", href: "/docente/grupos/nuevo" };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar nombre={docente.nombre} />
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Hola, {docente.nombre.split(" ")[0]}
          </h1>
        </div>
        <CerrarSesion />
      </div>

      <section aria-labelledby="ruta-docente">
        <Card className="flex flex-col gap-4 border-indigo-100 bg-indigo-50/60 p-5 dark:border-indigo-900 dark:bg-indigo-950/30">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
              <Sparkles className="size-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Siguiente paso</p>
              <h2 id="ruta-docente" className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-50">
                {siguientePaso.titulo}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{siguientePaso.descripcion}</p>
            </div>
          </div>
          <Link
            href={siguientePaso.href}
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
          >
            {siguientePaso.accion}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Card>
      </section>

      <section aria-labelledby="acciones-rapidas" className="flex flex-col gap-3">
        <div>
          <h2 id="acciones-rapidas" className="text-lg font-semibold text-slate-900 dark:text-slate-50">Acciones rápidas</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Tres caminos para avanzar sin buscar entre menús.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {[accionGrupo, accionContenido, accionSeguimiento].map((accion) => (
            <Link key={accion.titulo} href={accion.href}>
              <CardLink className="flex h-full flex-col gap-2 px-4 py-3.5">
                <span className="font-medium text-slate-900 dark:text-slate-50">{accion.titulo}</span>
                <span className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{accion.descripcion}</span>
                <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  Abrir <ArrowRight className="size-3.5" aria-hidden="true" />
                </span>
              </CardLink>
            </Link>
          ))}
        </div>
      </section>

      <section aria-label="Resumen de tu trabajo" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard etiqueta="Grupos activos" valor={grupos?.length ?? 0} icon={Users} tono="indigo" />
        <MetricCard etiqueta="Estudiantes" valor={totalEstudiantes} icon={Users} tono="emerald" />
        <MetricCard etiqueta="Actividades creadas" valor={actividades?.length ?? 0} icon={CheckCircle2} tono="slate" />
      </section>

      {totalCasosApoyo > 0 && (
        <section aria-labelledby="resumen-apoyo">
          <Card className="flex flex-col gap-3 border-amber-100 bg-amber-50/70 p-5 dark:border-amber-900 dark:bg-amber-950/25">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                <LifeBuoy className="size-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Resumen de apoyo</p>
                <h2 id="resumen-apoyo" className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-50">
                  {totalCasosApoyo} caso{totalCasosApoyo === 1 ? "" : "s"} para revisar cuando tengas tiempo
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  Es una guía para decidir dónde acercarte; no es una lista de calificaciones ni bloquea el avance del grupo.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {gruposConAtencion.slice(0, 3).map((grupo) => (
                <Link
                  key={grupo.id}
                  href={`/docente/grupos/${grupo.id}#apoyo`}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-100 dark:hover:bg-amber-950/50"
                >
                  {grupo.nombre} · {porRevisarPorGrupo.get(grupo.id)}
                </Link>
              ))}
            </div>
          </Card>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Tus grupos</h2>
          <Link href="/docente/grupos/nuevo">
            <Boton size="sm">
              <Plus className="size-4" aria-hidden="true" />
              Crear grupo
            </Boton>
          </Link>
        </div>
        {!grupos || grupos.length === 0 ? (
          <EmptyState
            icon={Users}
            titulo="Todavía no tienes grupos"
            descripcion="Crea el primero para generar su código de acceso."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {grupos.map((g) => (
              <Link key={g.id} href={`/docente/grupos/${g.id}`}>
                <CardLink className="flex items-center gap-4 px-4 py-3.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    <Users className="size-4" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-slate-50">{g.nombre}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-500">
                      Código {g.codigo_acceso} ·{" "}
                      {Array.isArray(g.estudiantes) ? g.estudiantes[0]?.count ?? 0 : 0} estudiantes
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                      {porRevisarPorGrupo.get(g.id) ?? 0} casos de apoyo · abre para ver el avance
                    </p>
                  </div>
                  {(porRevisarPorGrupo.get(g.id) ?? 0) > 0 && (
                    <Badge tono="warning">
                      <ClipboardCheck className="size-3" aria-hidden="true" />
                      {porRevisarPorGrupo.get(g.id)} atención
                    </Badge>
                  )}
                  <ChevronRight className="size-4 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                </CardLink>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section id="unidades" className="scroll-mt-4 flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Unidades del curso</h2>
        <div className="flex flex-col gap-2">
          {unidades?.map((u) => {
            const tema = temaUnidad(u.orden);
            return (
              <Link key={u.id} href={`/docente/unidades/${u.id}`}>
                <CardLink className="flex items-center gap-4 px-4 py-3.5">
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tema.icono}`}>
                    <BookOpen className="size-4" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-slate-50">
                      Unidad {u.orden}. {u.nombre}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-500">
                      {actividadesPorUnidad.get(u.id) ?? 0} actividades · {u.reto_comunicativo}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                </CardLink>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
