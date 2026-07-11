import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, ChevronRight, Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import CerrarSesion from "@/components/cerrar-sesion";
import Avatar from "@/components/ui/avatar";
import { CardLink } from "@/components/ui/card";
import Boton from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import { temaUnidad } from "@/lib/unidad-tema";

export default async function DashboardDocente() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/ingreso/profesora");

  const { data: docente } = await supabase
    .from("docentes")
    .select("nombre")
    .eq("id", user.id)
    .single();

  if (!docente) redirect("/ingreso/profesora/verificar");

  const { data: grupos } = await supabase
    .from("grupos")
    .select("id, nombre, codigo_acceso, estudiantes(count)")
    .eq("docente_id", user.id)
    .order("created_at", { ascending: false });

  const { data: unidades } = await supabase
    .from("unidades")
    .select("id, nombre, orden, reto_comunicativo")
    .order("orden");

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
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                </CardLink>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
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
                    <p className="text-sm text-slate-500 dark:text-slate-500">{u.reto_comunicativo}</p>
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
