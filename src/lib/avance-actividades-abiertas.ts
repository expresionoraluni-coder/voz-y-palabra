import { actividadAbierta } from "@/lib/eventos";
import { entregaCuentaComoCompletada } from "@/lib/progreso-unidad";

type ActividadDeAvance = {
  id: string;
  contenido?: unknown;
};

type EntregaDeAvance = {
  estudiante_id: string;
  actividad_id: string;
  puntaje_auto: number | null;
  respuesta?: unknown;
};

type AperturaDeActividad = {
  tipo: string;
  actividad_id: string | null;
  fecha: string;
};

/**
 * Resume el avance con la misma regla que ve el estudiante: solo cuenta las
 * actividades cuya fecha de apertura ya llegó y una entrega solo cuenta si
 * también resolvió el reintento requerido.
 */
export function calcularAvanceDeActividadesAbiertas({
  actividades,
  aperturas,
  entregas,
  estudiantesIds,
}: {
  actividades: ActividadDeAvance[];
  aperturas: AperturaDeActividad[];
  entregas: EntregaDeAvance[];
  estudiantesIds: string[];
}) {
  const actividadesPorId = new Map(actividades.map((actividad) => [actividad.id, actividad]));
  const actividadesAbiertas = new Set(
    aperturas
      .filter((apertura) => apertura.tipo === "apertura_actividad" && apertura.actividad_id && actividadAbierta(apertura.fecha))
      .map((apertura) => apertura.actividad_id!)
      .filter((actividadId) => actividadesPorId.has(actividadId)),
  );

  const completadasPorEstudiante = new Map<string, Set<string>>(
    estudiantesIds.map((estudianteId) => [estudianteId, new Set<string>()]),
  );

  for (const entrega of entregas) {
    if (!actividadesAbiertas.has(entrega.actividad_id)) continue;
    const actividad = actividadesPorId.get(entrega.actividad_id);
    if (!actividad || !entregaCuentaComoCompletada(entrega, actividad.contenido)) continue;
    completadasPorEstudiante.get(entrega.estudiante_id)?.add(entrega.actividad_id);
  }

  const totalAbiertas = actividadesAbiertas.size;
  const avancePorEstudiante = new Map(
    estudiantesIds.map((estudianteId) => [
      estudianteId,
      totalAbiertas === 0
        ? 0
        : Math.round(((completadasPorEstudiante.get(estudianteId)?.size ?? 0) / totalAbiertas) * 100),
    ]),
  );

  return { actividadesAbiertas, completadasPorEstudiante, avancePorEstudiante };
}
