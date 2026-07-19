import { Gauge } from "lucide-react";

function mensajeCalibracion(confianza: number, puntajeAuto: number): string {
  const confianzaPct = (confianza - 1) * 25;
  const diferencia = confianzaPct - puntajeAuto;
  if (diferencia > 25) {
    return `Te sentías muy seguro (${confianza}/5) pero acertaste ${puntajeAuto}% — repasa este tema antes de seguir, para no confiar de más la próxima vez.`;
  }
  if (diferencia < -25) {
    return `Te sentías poco seguro (${confianza}/5) y acertaste ${puntajeAuto}% — sabes más de lo que crees, confía un poco más en ti.`;
  }
  return `Tu confianza (${confianza}/5) estuvo bien calibrada con tu resultado (${puntajeAuto}%).`;
}

export default function CalibracionConfianza({
  confianza,
  puntajeAuto,
}: {
  confianza: number | null;
  puntajeAuto: number | null;
}) {
  if (confianza == null || puntajeAuto == null) return null;

  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 dark:border-indigo-900 dark:bg-indigo-950/40">
      <Gauge className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
      <p className="text-sm text-slate-700 dark:text-slate-300">{mensajeCalibracion(confianza, puntajeAuto)}</p>
    </div>
  );
}
