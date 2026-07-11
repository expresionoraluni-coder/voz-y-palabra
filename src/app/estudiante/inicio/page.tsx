import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, Bell, BookOpen, ChevronRight, FolderHeart, KeyRound, RotateCcw, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import CerrarSesion from "@/components/cerrar-sesion";
import Avatar from "@/components/ui/avatar";
import { CardLink } from "@/components/ui/card";
import Badge from "@/components/ui/badge";
import MetricCard from "@/components/ui/metric-card";
import ProgressBar from "@/components/ui/progress-bar";
import Alert from "@/components/ui/alert";
import CelebracionInsignia from "../celebracion-insignia";
import { temaUnidad } from "@/lib/unidad-tema";

export default async function InicioEstudiante({
  searchParams,
}: {
  searchParams: Promise<{ nip?: string }>;
}) {
  const { nip } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/ingreso/estudiante");

  const { data: estudiante } = await supabase
    .from("estudiantes")
    .select("id, nombre, grupo_id, grupos(nombre)")
    .eq("auth_user_id", user.id)
    .single();

  if (!estudiante) redirect("/ingreso/estudiante");

  const grupo = Array.isArray(estudiante.grupos) ? estudiante.grupos[0] : estudiante.grupos;

  const { data: unidades } = await supabase
    .from("unidades")
    .select("id, nombre, orden, reto_comunicativo, actividades(id)")
    .order("orden");

  // Revisa y otorga insignias nuevas cada vez que el estudiante visita su inicio.
  const { data: insignias } = await supabase.rpc("verificar_insignias");

  const [{ data: entregas }, { count: totalReflexiones }] = await Promise.all([
    supabase
      .from("entregas")
      .select("actividad_id, puntaje_auto, actividades(titulo)")
      .eq("estudiante_id", estudiante.id),
    supabase
      .from("reflexiones")
      .select("id", { count: "exact", head: true })
      .eq("estudiante_id", estudiante.id)
      .eq("momento", "cierre"),
  ]);

  const idsCompletadas = new Set((entregas ?? []).map((e) => e.actividad_id));
  const puntos = idsCompletadas.size * 10 + (totalReflexiones ?? 0) * 5;

  const paraRepasar = (entregas ?? [])
    .filter((e) => e.puntaje_auto !== null && e.puntaje_auto < 70)
    .slice(0, 3);

  const { data: avisos } = await supabase
    .from("avisos")
    .select("id, titulo, mensaje, created_at")
    .or(`grupo_id.is.null,grupo_id.eq.${estudiante.grupo_id}`)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <CelebracionInsignia insignias={insignias ?? []} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar nombre={estudiante.nombre} />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              Hola, {estudiante.nombre.split(" ")[0]}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-500">
              Grupo {grupo?.nombre ?? "—"}
            </p>
          </div>
        </div>
        <CerrarSesion />
      </div>

      {nip === "nuevo" && (
        <Alert tono="success" titulo="Tu NIP quedó guardado">
          <span className="flex items-center gap-1.5">
            <KeyRound className="size-3.5 shrink-0" aria-hidden="true" />
            Apúntalo: la próxima vez que entres con tu nombre, te lo vamos a pedir.
          </span>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3">
        <MetricCard etiqueta="Puntos" valor={puntos} icon={Sparkles} tono="indigo" />
        <Link href="/estudiante/insignias">
          <MetricCard etiqueta="Insignias" valor={insignias?.length ?? 0} icon={Award} tono="amber" />
        </Link>
      </div>

      <Link
        href="/estudiante/portafolio"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
      >
        <FolderHeart className="size-4" aria-hidden="true" />
        Ver mi portafolio
        <ChevronRight className="size-3.5" aria-hidden="true" />
      </Link>

      {avisos && avisos.length > 0 && (
        <div className="flex flex-col gap-2">
          {avisos.map((a) => (
            <div
              key={a.id}
              className="flex gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 dark:border-indigo-900 dark:bg-indigo-950/40"
            >
              <Bell className="mt-0.5 size-4 shrink-0 text-indigo-500 dark:text-indigo-400" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{a.titulo}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{a.mensaje}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {insignias && insignias.length > 0 && (
        <Link href="/estudiante/insignias">
          <CardLink className="flex items-center justify-between gap-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              {insignias.slice(0, 4).map((i: { nombre: string; descripcion: string }) => (
                <Badge key={i.nombre} tono="warning" title={i.descripcion}>
                  <Award className="size-3" aria-hidden="true" />
                  {i.nombre}
                </Badge>
              ))}
              {insignias.length > 4 && (
                <span className="text-xs font-medium text-slate-500 dark:text-slate-500">
                  +{insignias.length - 4} más
                </span>
              )}
            </div>
            <ChevronRight className="size-4 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden="true" />
          </CardLink>
        </Link>
      )}

      {paraRepasar.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-slate-50">
            <RotateCcw className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            Para repasar
          </p>
          <div className="flex flex-col gap-2">
            {paraRepasar.map((e) => {
              const act = Array.isArray(e.actividades) ? e.actividades[0] : e.actividades;
              return (
                <Link key={e.actividad_id} href={`/estudiante/actividad/${e.actividad_id}`}>
                  <CardLink className="flex items-center gap-3 px-4 py-3">
                    <span className="flex-1 text-sm font-medium text-slate-900 dark:text-slate-50">
                      {act?.titulo}
                    </span>
                    <Badge tono="warning">{e.puntaje_auto}% correcto</Badge>
                  </CardLink>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Tu ruta</p>
        <div className="flex flex-col gap-3">
          {unidades?.map((u) => {
            const total = u.actividades.length;
            const hechas = u.actividades.filter((a) => idsCompletadas.has(a.id)).length;
            const pct = total > 0 ? Math.round((hechas / total) * 100) : 0;
            const tema = temaUnidad(u.orden);
            return (
              <Link key={u.id} href={`/estudiante/unidad/${u.id}`}>
                <CardLink className="flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg font-semibold ${tema.icono}`}
                      >
                        <BookOpen className="size-4" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-50">
                          Unidad {u.orden}. {u.nombre}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-500">
                          {u.reto_comunicativo}
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      className="mt-1 size-4 shrink-0 text-slate-300 dark:text-slate-600"
                      aria-hidden="true"
                    />
                  </div>
                  {total > 0 && (
                    <div className="flex items-center gap-3 pl-12">
                      <ProgressBar porcentaje={pct} gradiente={tema.barra} />
                      <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-500">
                        {hechas}/{total}
                      </span>
                    </div>
                  )}
                </CardLink>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
