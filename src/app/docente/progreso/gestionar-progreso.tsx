"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eraser, ShieldCheck } from "lucide-react";
import Boton from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorText, Input } from "@/components/ui/field";
import {
  limpiarProgresoActividad,
  previsualizarLimpiezaProgreso,
  type VistaPreviaLimpieza,
} from "./acciones-progreso";
import { CONFIRMACION_LIMPIEZA } from "./constantes-progreso";

export type ActividadParaLimpieza = {
  id: string;
  titulo: string;
  unidadNombre: string;
  unidadOrden: number | null;
  orden: number | null;
  fechaApertura?: string | null;
};

function formatearFecha(fecha: string | null | undefined) {
  if (!fecha) return "Sin apertura registrada";
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function etiquetaActividad(actividad: { unidadOrden: number | null; orden: number | null }) {
  const unidad = actividad.unidadOrden == null ? "Unidad —" : `Unidad ${actividad.unidadOrden}`;
  const orden = actividad.orden == null ? "Actividad —" : `Actividad ${actividad.orden}`;
  return `${unidad} · ${orden}`;
}

export default function GestionarProgreso({
  grupoId,
  actividades,
  estudianteId,
  nombreEstudiante,
}: {
  grupoId: string;
  actividades: ActividadParaLimpieza[];
  estudianteId?: string;
  nombreEstudiante?: string;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
  const [vistaPrevia, setVistaPrevia] = useState<VistaPreviaLimpieza | null>(null);
  const [confirmacion, setConfirmacion] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);

  const actividadesOrdenadas = useMemo(
    () => [...actividades].sort((a, b) =>
      (a.unidadOrden ?? Number.MAX_SAFE_INTEGER) - (b.unidadOrden ?? Number.MAX_SAFE_INTEGER)
      || (a.orden ?? Number.MAX_SAFE_INTEGER) - (b.orden ?? Number.MAX_SAFE_INTEGER)
      || a.titulo.localeCompare(b.titulo, "es")),
    [actividades],
  );

  function cambiarActividad(id: string) {
    setVistaPrevia(null);
    setResultado(null);
    setSeleccionadas((actuales) => actuales.includes(id) ? actuales.filter((actual) => actual !== id) : [...actuales, id]);
  }

  async function preparar() {
    if (cargando || seleccionadas.length === 0) return;
    setCargando(true);
    setError(null);
    setResultado(null);
    try {
      const respuesta = await previsualizarLimpiezaProgreso(grupoId, seleccionadas, estudianteId);
      if (!respuesta.ok) setError(respuesta.error);
      else setVistaPrevia(respuesta);
    } catch {
      setError("No pudimos revisar el progreso. Actualiza la página y vuelve a intentarlo.");
    } finally {
      setCargando(false);
    }
  }

  async function confirmarLimpieza() {
    if (cargando || !vistaPrevia) return;
    setCargando(true);
    setError(null);
    try {
      const respuesta = await limpiarProgresoActividad(
        grupoId,
        seleccionadas,
        vistaPrevia.conteos,
        confirmacion,
        estudianteId,
      );
      if (!respuesta.ok) {
        setError(respuesta.error);
        return;
      }
      setConfirmacion("");
      setVistaPrevia(null);
      setSeleccionadas([]);
      setResultado(`Operación ${respuesta.operacionId} completada: ${respuesta.eliminadas.entregas} entregas, ${respuesta.eliminadas.reflexiones} reflexiones y ${respuesta.eliminadas.retroalimentaciones} retroalimentaciones eliminadas.`);
      router.refresh();
    } catch {
      setError("No pudimos completar la limpieza. Actualiza la página y vuelve a revisar la vista previa.");
    } finally {
      setCargando(false);
    }
  }

  if (actividadesOrdenadas.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/70 dark:bg-amber-950/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-amber-950 dark:text-amber-100">
            <Eraser className="size-4" aria-hidden="true" />
            Mantenimiento del progreso
          </p>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-amber-900/80 dark:text-amber-100/80">
            {estudianteId
              ? `Reinicia solo el progreso de ${nombreEstudiante ?? "este estudiante"} en las actividades que elijas.`
              : "Limpia el progreso de todos los estudiantes de este grupo en las actividades que elijas."}
            {" "}No cierra actividades ni elimina contenidos, aperturas o registros de unidad.
          </p>
        </div>
        {!abierto && (
          <Boton type="button" size="sm" variant="secondary" onClick={() => setAbierto(true)}>
            Gestionar progreso
          </Boton>
        )}
      </div>

      {abierto && (
        <div className="mt-4 flex flex-col gap-4 border-t border-amber-200 pt-4 dark:border-amber-900/60">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Selecciona actividades</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">La fecha mostrada solo informa la apertura; permanecerá intacta.</p>
            </div>
            <Boton type="button" size="sm" variant="ghost" onClick={() => { setAbierto(false); setVistaPrevia(null); setError(null); }}>
              Cerrar
            </Boton>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {actividadesOrdenadas.map((actividad) => (
              <label key={actividad.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <input
                  type="checkbox"
                  checked={seleccionadas.includes(actividad.id)}
                  onChange={() => cambiarActividad(actividad.id)}
                  className="mt-1 size-4 shrink-0 accent-indigo-600"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-900 dark:text-slate-50">{actividad.titulo}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {etiquetaActividad(actividad)} · {formatearFecha(actividad.fechaApertura)}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Boton type="button" size="sm" onClick={preparar} cargando={cargando} disabled={seleccionadas.length === 0}>
              {cargando ? "Revisando…" : "Ver qué se afectará"}
            </Boton>
            <span className="text-xs text-slate-500 dark:text-slate-400">Seleccionadas: {seleccionadas.length}</span>
          </div>

          {vistaPrevia && (
            <div className="flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/70 dark:bg-red-950/25" role="alert">
              <div>
                <p className="text-sm font-bold text-red-900 dark:text-red-100">Vista previa de una eliminación permanente</p>
                <p className="mt-1 text-sm text-red-800 dark:text-red-200">
                  Alcance: {vistaPrevia.estudiante ? vistaPrevia.estudiante.nombre : `${vistaPrevia.conteos.estudiantes} estudiante(s) del grupo ${vistaPrevia.grupo.nombre}`}.
                </p>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
                <p><strong>{vistaPrevia.conteos.entregas}</strong> entregas</p>
                <p><strong>{vistaPrevia.conteos.reflexiones}</strong> reflexiones de actividad</p>
                <p><strong>{vistaPrevia.conteos.retroalimentaciones}</strong> retroalimentaciones</p>
                <p><strong>{vistaPrevia.conteos.archivos}</strong> archivos asociados</p>
                <p><strong>0</strong> aperturas afectadas</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-white/70 p-3 text-xs text-red-950 dark:border-red-900/70 dark:bg-slate-950/30 dark:text-red-100">
                <p className="font-semibold">Se revisó exactamente:</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {vistaPrevia.actividades.map((actividad) => (
                    <li key={actividad.id} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                      <span><strong>{etiquetaActividad(actividad)}</strong> · {actividad.titulo}</span>
                      <span className="shrink-0 text-red-800/80 dark:text-red-200/80">
                        {actividad.conteos.entregas} entregas · {actividad.conteos.reflexiones} reflexiones · {actividad.conteos.retroalimentaciones} retroalimentaciones
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-100">
                <p className="flex items-center gap-1.5 font-semibold"><ShieldCheck className="size-3.5" aria-hidden="true" /> Se conservarán actividades, contenidos, fechas, bitácoras, confianza e insignias.</p>
                <p className="mt-1">La copia privada se genera antes de borrar. Si alguien guarda una entrega mientras confirmas, la operación se cancela para que vuelvas a revisar.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirmacion-limpieza" className="text-xs font-semibold text-red-900 dark:text-red-100">Escribe {CONFIRMACION_LIMPIEZA} para confirmar</label>
                <Input id="confirmacion-limpieza" value={confirmacion} onChange={(event) => setConfirmacion(event.target.value)} autoComplete="off" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Boton type="button" size="sm" variant="destructive" onClick={confirmarLimpieza} cargando={cargando} disabled={confirmacion !== CONFIRMACION_LIMPIEZA}>
                  {cargando ? "Limpiando…" : "Eliminar este progreso"}
                </Boton>
                <Boton type="button" size="sm" variant="ghost" onClick={() => { setVistaPrevia(null); setConfirmacion(""); }} disabled={cargando}>
                  Cancelar
                </Boton>
              </div>
            </div>
          )}

          {error && <ErrorText>{error}</ErrorText>}
          {resultado && <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">{resultado}</p>}
        </div>
      )}
    </Card>
  );
}
