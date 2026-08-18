import { MessageSquareText } from "lucide-react";
import { requerirAdministrador } from "@/lib/supabase/requerir-administrador";
import EmptyState from "@/components/ui/empty-state";
import { revisarErrorConsulta } from "@/lib/revisar-error-consulta";
import BandejaReportes from "./bandeja-reportes";

type Reporte = {
  id: string;
  reportante_id: string;
  reportante_tipo: "estudiante" | "docente";
  estudiante_id: string | null;
  docente_id: string | null;
  grupo_id: string | null;
  unidad_id: string | null;
  actividad_id: string | null;
  categoria: string;
  descripcion: string;
  estado: string;
  prioridad: string;
  ruta: string | null;
  contexto: Record<string, unknown>;
  resolucion: string | null;
  atendido_por: string | null;
  created_at: string;
  updated_at: string;
};

function obtenerAntiguedad(createdAt: string) {
  const horas = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 3_600_000));
  return horas >= 24 ? `Hace ${Math.floor(horas / 24)} d` : horas > 0 ? `Hace ${horas} h` : "Hace un momento";
}

export default async function AdminReportes() {
  const { supabase } = await requerirAdministrador();
  const { data: reportes, error: reportesError } = await supabase
    .from("reportes")
    .select("id, reportante_id, reportante_tipo, estudiante_id, docente_id, grupo_id, unidad_id, actividad_id, categoria, descripcion, estado, prioridad, ruta, contexto, resolucion, atendido_por, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(100);

  revisarErrorConsulta(reportesError, "No pudimos cargar la bandeja de reportes.");

  const reportesCargados = reportes ?? [];
  const grupoIds = [...new Set(reportesCargados.map((reporte) => reporte.grupo_id).filter((id): id is string => Boolean(id)))];
  const estudianteIds = [...new Set(reportesCargados.map((reporte) => reporte.estudiante_id).filter((id): id is string => Boolean(id)))];
  const docenteIds = [...new Set(reportesCargados.map((reporte) => reporte.docente_id).filter((id): id is string => Boolean(id)))];

  const [gruposResultado, estudiantesResultado, docentesResultado] = await Promise.all([
    grupoIds.length ? supabase.from("grupos").select("id, nombre").in("id", grupoIds) : Promise.resolve({ data: [], error: null }),
    estudianteIds.length ? supabase.from("estudiantes").select("id, nombre").in("id", estudianteIds) : Promise.resolve({ data: [], error: null }),
    docenteIds.length ? supabase.from("docentes").select("id, nombre").in("id", docenteIds) : Promise.resolve({ data: [], error: null }),
  ]);

  const { data: grupos, error: gruposError } = gruposResultado;
  const { data: estudiantes, error: estudiantesError } = estudiantesResultado;
  const { data: docentes, error: docentesError } = docentesResultado;

  revisarErrorConsulta(gruposError, "No pudimos cargar los nombres de los grupos.");
  revisarErrorConsulta(estudiantesError, "No pudimos cargar los nombres de estudiantes.");
  revisarErrorConsulta(docentesError, "No pudimos cargar los nombres de docentes.");

  const gruposMapa = new Map((grupos ?? []).map((grupo) => [grupo.id, grupo.nombre]));
  const estudiantesMapa = new Map((estudiantes ?? []).map((estudiante) => [estudiante.id, estudiante.nombre]));
  const docentesMapa = new Map((docentes ?? []).map((docente) => [docente.id, docente.nombre]));

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Atención</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Reportes de estudiantes y docentes</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Tú atiendes todos los casos. Cambiar el estado o escribir una resolución no modifica las respuestas ni el avance del estudiante. Se muestran los 100 casos más recientes.
        </p>
      </section>

      {reportesCargados.length === 0 ? (
        <EmptyState icon={MessageSquareText} titulo="Aún no hay reportes" descripcion="Cuando un estudiante o la docente solicite ayuda, el caso aparecerá aquí con su contexto automático." />
      ) : (
        <BandejaReportes
          reportes={(reportesCargados as Reporte[]).map((reporte) => ({ ...reporte, antiguedad: obtenerAntiguedad(reporte.created_at) }))}
          grupos={gruposMapa}
          estudiantes={estudiantesMapa}
          docentes={docentesMapa}
        />
      )}
    </div>
  );
}
