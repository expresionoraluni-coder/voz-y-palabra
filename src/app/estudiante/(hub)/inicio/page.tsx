import Link from "next/link";
import {
  Award,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  Flame,
  FolderHeart,
  KeyRound,
  LineChart,
  Map,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireEstudiante } from "@/lib/requerir-estudiante";
import CerrarSesion from "@/components/cerrar-sesion";
import CambiarNip from "@/components/cambiar-nip";
import Avatar from "@/components/ui/avatar";
import { CardLink } from "@/components/ui/card";
import Badge from "@/components/ui/badge";
import MetricCard from "@/components/ui/metric-card";
import ProgressBar from "@/components/ui/progress-bar";
import Alert from "@/components/ui/alert";
import EmptyState from "@/components/ui/empty-state";
import CelebracionInsignia from "@/app/estudiante/celebracion-insignia";
import { temaUnidad } from "@/lib/unidad-tema";
import { calcularRacha } from "@/lib/racha";
import { diasFaltantes, textoFaltan } from "@/lib/eventos";
import { proximoRepaso } from "@/lib/calendario-repaso";

type Grupo = { nombre: string } | { nombre: string }[] | null;

const MENSAJES_RACHA = [
  "Se nota la constancia.",
  "Llevas un buen ritmo de práctica.",
  "Cada día suma más de lo que parece.",
  "Estás construyendo un hábito real.",
];

function mensajeRacha(racha: number): string {
  return MENSAJES_RACHA[racha % MENSAJES_RACHA.length];
}

export default async function InicioEstudiante({
  searchParams,
}: {
  searchParams: Promise<{ nip?: string }>;
}) {
  const { nip } = await searchParams;
  const supabase = await createClient();
  const estudiante = await requireEstudiante<{
    id: string;
    nombre: string;
    grupo_id: string;
    grupos: Grupo;
  }>(supabase, "id, nombre, grupo_id, grupos(nombre)");

  const grupo = Array.isArray(estudiante.grupos) ? estudiante.grupos[0] : estudiante.grupos;

  // avisos y eventosProximos solo dependen de estudiante.grupo_id, ya
  // conocido en cuanto resuelve requireEstudiante, así que van en este
  // mismo Promise.all en vez de esperar a un segundo lote — el único que
  // sigue aparte es bitacoraActiva, porque necesita unidadActiva, que se
  // calcula a partir de unidades y entregas de aquí abajo.
  const [
    { data: unidades },
    { data: insignias },
    { data: entregas },
    { count: totalReflexiones },
    { data: avisos },
    { data: eventosProximos },
  ] = await Promise.all([
    supabase
      .from("unidades")
      .select("id, nombre, orden, reto_comunicativo, actividades(id)")
      .order("orden"),
    // Revisa y otorga insignias nuevas cada vez que el estudiante visita su inicio.
    supabase.rpc("verificar_insignias"),
    supabase
      .from("entregas")
      .select("actividad_id, puntaje_auto, created_at, actividades(titulo)")
      .eq("estudiante_id", estudiante.id),
    supabase
      .from("reflexiones")
      .select("id", { count: "exact", head: true })
      .eq("estudiante_id", estudiante.id)
      .eq("momento", "cierre"),
    supabase
      .from("avisos")
      .select("id, titulo, mensaje, created_at")
      .or(`grupo_id.is.null,grupo_id.eq.${estudiante.grupo_id}`)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("eventos")
      .select("id, titulo, fecha")
      .eq("grupo_id", estudiante.grupo_id)
      .gte("fecha", new Date().toISOString().slice(0, 10))
      .order("fecha")
      .limit(3),
  ]);

  const idsCompletadas = new Set((entregas ?? []).map((e) => e.actividad_id));
  const puntos = idsCompletadas.size * 10 + (totalReflexiones ?? 0) * 5;
  const racha = calcularRacha((entregas ?? []).map((e) => e.created_at));

  // Prioriza vencidos y, entre los vigentes, el repaso más próximo — antes
  // salían en el orden arbitrario en que llegaban de Supabase.
  const paraRepasar = (entregas ?? [])
    .filter((e) => e.puntaje_auto !== null && e.puntaje_auto < 70)
    .map((e) => ({ ...e, repaso: proximoRepaso(e.created_at) }))
    .sort((a, b) =>
      a.repaso.vencido !== b.repaso.vencido
        ? a.repaso.vencido
          ? -1
          : 1
        : a.repaso.fecha.localeCompare(b.repaso.fecha),
    )
    .slice(0, 3);

  // Progreso por unidad, precalculado una vez para usarlo tanto en el
  // resumen de puntos como en la ruta de aprendizaje.
  const unidadesConProgreso = (unidades ?? []).map((u) => {
    const total = u.actividades.length;
    const hechas = u.actividades.filter((a) => idsCompletadas.has(a.id)).length;
    const pct = total > 0 ? Math.round((hechas / total) * 100) : 0;
    return { ...u, total, hechas, pct };
  });
  const indiceActiva = unidadesConProgreso.findIndex((u) => u.pct < 100);
  const unidadActiva = unidadesConProgreso[indiceActiva === -1 ? unidadesConProgreso.length - 1 : indiceActiva];

  const { data: bitacoraActiva } = unidadActiva
    ? await supabase
        .from("bitacora")
        .select("id")
        .eq("estudiante_id", estudiante.id)
        .eq("unidad_id", unidadActiva.id)
        .maybeSingle()
    : { data: null };

  const recordatorios: { texto: string; href: string }[] = [];
  for (const ev of eventosProximos ?? []) {
    const dias = diasFaltantes(ev.fecha);
    if (dias <= 7) recordatorios.push({ texto: `${ev.titulo} — ${textoFaltan(dias)}`, href: "/estudiante/calendario" });
  }
  if (unidadActiva && !bitacoraActiva) {
    recordatorios.push({
      texto: `Aún no defines tu meta para Unidad ${unidadActiva.orden}`,
      href: `/estudiante/unidad/${unidadActiva.id}`,
    });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <CelebracionInsignia insignias={insignias ?? []} estudianteId={estudiante.id} />
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

      <CambiarNip />

      {nip === "nuevo" && (
        <Alert tono="success" titulo="Tu NIP quedó guardado">
          <span className="flex items-center gap-1.5">
            <KeyRound className="size-3.5 shrink-0" aria-hidden="true" />
            Apúntalo: la próxima vez que entres con tu nombre, te lo vamos a pedir.
          </span>
        </Alert>
      )}

      {racha > 0 && (
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-4 text-white shadow-lg shadow-orange-500/25">
          <Flame className="size-8 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-2xl font-bold leading-tight">
              {racha} {racha === 1 ? "día" : "días"} seguidos
            </p>
            <p className="text-sm text-orange-50">{mensajeRacha(racha)}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <MetricCard etiqueta="Puntos" valor={puntos} icon={Sparkles} tono="indigo" />
        <Link href="/estudiante/insignias">
          <MetricCard etiqueta="Insignias" valor={insignias?.length ?? 0} icon={Award} tono="amber" />
        </Link>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <Link
          href="/estudiante/portafolio"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          <FolderHeart className="size-4" aria-hidden="true" />
          Ver mi portafolio
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </Link>
        <Link
          href="/estudiante/calendario"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          <CalendarDays className="size-4" aria-hidden="true" />
          Ver mi calendario
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </Link>
        <Link
          href="/estudiante/progreso"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          <LineChart className="size-4" aria-hidden="true" />
          Mi progreso
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      {recordatorios.length > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3.5 dark:border-amber-900 dark:bg-amber-950/40">
          <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-slate-50">
            <Bell className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            Recordatorios
          </p>
          <div className="flex flex-col gap-1.5">
            {recordatorios.map((r, i) => (
              <Link
                key={i}
                href={r.href}
                className="text-sm text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
              >
                {r.texto}
              </Link>
            ))}
          </div>
        </div>
      )}

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
        {unidadesConProgreso.length === 0 ? (
          <EmptyState
            icon={Map}
            titulo="Todavía no hay unidades"
            descripcion="Cuando tu profesora publique el curso, tu ruta va a aparecer aquí."
          />
        ) : (
        <div className="relative flex flex-col gap-6">
          <div
            className="absolute bottom-7 left-[27px] top-7 w-0.5 bg-gradient-to-b from-violet-300 via-teal-300 to-rose-300 dark:from-violet-800 dark:via-teal-800 dark:to-rose-800"
            aria-hidden="true"
          />
          {unidadesConProgreso.map((u, idx) => {
            const tema = temaUnidad(u.orden);
            const completa = u.pct === 100;
            const activa = idx === indiceActiva || (indiceActiva === -1 && idx === unidadesConProgreso.length - 1);
            return (
              <Link key={u.id} href={`/estudiante/unidad/${u.id}`} className="relative">
                <div className="flex items-start gap-4">
                  <div
                    className={`relative z-10 flex size-14 shrink-0 items-center justify-center rounded-full border-4 border-white shadow-sm dark:border-slate-950 ${
                      completa
                        ? `bg-gradient-to-br ${tema.barra} text-white`
                        : activa
                          ? `bg-gradient-to-br ${tema.barra} text-white`
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {activa && !completa && (
                      <span
                        className={`absolute inset-0 -z-10 animate-ping rounded-full bg-gradient-to-br opacity-40 ${tema.barra}`}
                        aria-hidden="true"
                      />
                    )}
                    {completa ? (
                      <Check className="size-6" aria-hidden="true" strokeWidth={3} />
                    ) : (
                      <span className="text-lg font-bold">{u.orden}</span>
                    )}
                  </div>
                  <div
                    className={`flex-1 rounded-2xl border p-4 transition-colors ${
                      activa
                        ? "border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-900"
                        : "border-transparent bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">
                          Unidad {u.orden}. {u.nombre}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-500">{u.reto_comunicativo}</p>
                      </div>
                      <ChevronRight
                        className="mt-1 size-4 shrink-0 text-slate-300 dark:text-slate-600"
                        aria-hidden="true"
                      />
                    </div>
                    {u.total > 0 && (
                      <div className="mt-3 flex items-center gap-3">
                        <ProgressBar porcentaje={u.pct} gradiente={tema.barra} />
                        <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-500">
                          {u.hechas}/{u.total}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}
