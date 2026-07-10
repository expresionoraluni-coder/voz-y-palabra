import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AgregarEstudiantes from "./agregar-estudiantes";
import Avisos from "./avisos";

const DIAS_INACTIVIDAD = 10;

export default async function DetalleGrupo({
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

  const { data: grupo } = await supabase
    .from("grupos")
    .select("id, nombre, codigo_acceso, ciclo_escolar")
    .eq("id", id)
    .single();

  if (!grupo) notFound();

  const [
    { data: estudiantes },
    { data: unidades },
    { data: actividades },
    { data: confianzas },
    { data: avisos },
  ] = await Promise.all([
    supabase.from("estudiantes").select("id, nombre, created_at").eq("grupo_id", id).order("nombre"),
    supabase.from("unidades").select("id, nombre, orden").order("orden"),
    supabase.from("actividades").select("id, unidad_id"),
    supabase.from("autoevaluaciones_confianza").select("estudiante_id, unidad_id, momento, valor"),
    supabase
      .from("avisos")
      .select("id, titulo, mensaje, created_at")
      .eq("grupo_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const idsEstudiantes = estudiantes?.map((e) => e.id) ?? [];
  const { data: entregas } = idsEstudiantes.length
    ? await supabase
        .from("entregas")
        .select("id, estudiante_id, actividad_id, estado, created_at, actividades(titulo, unidad_id)")
        .in("estudiante_id", idsEstudiantes)
    : { data: [] };

  const totalActividades = actividades?.length ?? 0;
  const hoy = Date.now();

  const porEstudiante = (estudiantes ?? []).map((e) => {
    const misEntregas = (entregas ?? []).filter((en) => en.estudiante_id === e.id);
    const avance = totalActividades > 0 ? Math.round((misEntregas.length / totalActividades) * 100) : 0;
    const fechas = misEntregas.map((en) => new Date(en.created_at).getTime());
    const ultima = fechas.length ? Math.max(...fechas) : null;
    const diasInactivo = ultima ? Math.floor((hoy - ultima) / (1000 * 60 * 60 * 24)) : null;
    return { ...e, avance, ultima, diasInactivo, totalEntregas: misEntregas.length };
  });

  const avancePromedio =
    porEstudiante.length > 0
      ? Math.round(porEstudiante.reduce((s, e) => s + e.avance, 0) / porEstudiante.length)
      : 0;
  const activosSemana = porEstudiante.filter((e) => e.diasInactivo !== null && e.diasInactivo <= 7).length;
  const entregasPorRevisar = (entregas ?? []).filter((en) => en.estado === "pendiente_revision");

  const avancePorUnidad = (unidades ?? []).map((u) => {
    const actsUnidad = (actividades ?? []).filter((a) => a.unidad_id === u.id);
    const totalPosible = actsUnidad.length * (estudiantes?.length ?? 0);
    const hechas = (entregas ?? []).filter((en) =>
      actsUnidad.some((a) => a.id === en.actividad_id),
    ).length;
    return {
      ...u,
      porcentaje: totalPosible > 0 ? Math.round((hechas / totalPosible) * 100) : 0,
    };
  });

  const alertas: string[] = [];
  for (const e of porEstudiante) {
    if (e.totalEntregas === 0) {
      const diasDesdeAlta = Math.floor((hoy - new Date(e.created_at).getTime()) / (1000 * 60 * 60 * 24));
      if (diasDesdeAlta >= 3) alertas.push(`${e.nombre} todavía no ha empezado a practicar.`);
    } else if (e.diasInactivo !== null && e.diasInactivo > DIAS_INACTIVIDAD) {
      alertas.push(`${e.nombre} sin actividad hace ${e.diasInactivo} días.`);
    }
  }
  for (const c of confianzas ?? []) {
    if (c.momento !== "inicio") continue;
    const est = porEstudiante.find((e) => e.id === c.estudiante_id);
    if (!est) continue;
    if (c.valor >= 70 && est.totalEntregas === 0) {
      alertas.push(`${est.nombre} dice sentirse seguro pero no ha completado actividades.`);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 bg-white px-6 py-10 dark:bg-black">
      <div>
        <Link href="/docente/dashboard" className="text-sm text-zinc-500 underline dark:text-zinc-400">
          ← Volver
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {grupo.nombre}
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Código de acceso:{" "}
          <span className="rounded bg-zinc-100 px-2 py-1 font-mono text-lg font-semibold dark:bg-zinc-900">
            {grupo.codigo_acceso}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-zinc-100 px-4 py-3 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-500">Avance promedio</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{avancePromedio}%</p>
        </div>
        <div className="rounded-lg bg-zinc-100 px-4 py-3 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-500">Activos esta semana</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {activosSemana}/{estudiantes?.length ?? 0}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-100 px-4 py-3 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-500">Por revisar</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{entregasPorRevisar.length}</p>
        </div>
        <div className="rounded-lg bg-zinc-100 px-4 py-3 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-500">Estudiantes</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{estudiantes?.length ?? 0}</p>
        </div>
      </div>

      {alertas.length > 0 && (
        <section className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Alertas</p>
          {alertas.map((a, i) => (
            <p key={i} className="text-sm text-amber-800 dark:text-amber-300">
              {a}
            </p>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Avance por unidad</h2>
        {avancePorUnidad.map((u) => (
          <div key={u.id}>
            <div className="mb-1 flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
              <span>
                Unidad {u.orden}. {u.nombre}
              </span>
              <span>{u.porcentaje}%</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-900">
              <div
                className="h-2 rounded-full bg-zinc-900 dark:bg-zinc-50"
                style={{ width: `${u.porcentaje}%` }}
              />
            </div>
          </div>
        ))}
      </section>

      {entregasPorRevisar.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            Entregas por revisar
          </h2>
          <ul className="flex flex-col gap-1">
            {entregasPorRevisar.map((en) => {
              const est = porEstudiante.find((e) => e.id === en.estudiante_id);
              const act = Array.isArray(en.actividades) ? en.actividades[0] : en.actividades;
              return (
                <li key={en.id}>
                  <Link
                    href={`/docente/estudiantes/${en.estudiante_id}`}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-2 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                  >
                    <span className="text-zinc-900 dark:text-zinc-50">
                      {est?.nombre} · {act?.titulo}
                    </span>
                    <span className="text-sm text-zinc-500 dark:text-zinc-500">Revisar →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Avisos grupoId={grupo.id} avisos={avisos ?? []} />

      <AgregarEstudiantes grupoId={grupo.id} />

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Estudiantes ({estudiantes?.length ?? 0})
        </h2>
        {!estudiantes || estudiantes.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            Todavía no hay estudiantes en este grupo.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {porEstudiante.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/docente/estudiantes/${e.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-2 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <span className="text-zinc-900 dark:text-zinc-50">{e.nombre}</span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-500">{e.avance}%</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
