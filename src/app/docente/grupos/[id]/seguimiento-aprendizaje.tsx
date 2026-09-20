"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ExportarGrupo from "./exportar-grupo";
import type { EstudianteResumen } from "./grupo-estudiantes-panel";
import type {
  ActividadSeguimiento,
  BitacoraSeguimiento,
  ConfianzaSeguimiento,
  EntregaSeguimiento,
  ReflexionSeguimiento,
  UnidadSeguimiento,
} from "./tipos-seguimiento";
import { casoCalibracion } from "@/lib/calibracion-confianza";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";

type Vista = "unidad" | "actividad";

function etiquetaCalibracion(confianza: number | null, resultado: number | null) {
  if (confianza === null || resultado === null) {
    return { texto: "Sin datos comparables", clases: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" };
  }

  const caso = casoCalibracion(confianza, resultado);
  if (caso === "sobreconfianza") {
    return { texto: "Confianza mayor al resultado", clases: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200" };
  }
  if (caso === "subconfianza") {
    return { texto: "Resultado mayor a la confianza", clases: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200" };
  }
  return { texto: "Confianza y resultado alineados", clases: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200" };
}

export default function SeguimientoAprendizaje({
  nombreGrupo,
  codigoGrupo,
  estudiantes,
  unidades,
  actividades,
  entregas,
  confianzas,
  reflexiones,
  bitacoras,
}: {
  nombreGrupo: string;
  codigoGrupo: string;
  estudiantes: EstudianteResumen[];
  unidades: UnidadSeguimiento[];
  actividades: ActividadSeguimiento[];
  entregas: EntregaSeguimiento[];
  confianzas: ConfianzaSeguimiento[];
  reflexiones: ReflexionSeguimiento[];
  bitacoras: BitacoraSeguimiento[];
}) {
  const [vista, setVista] = useState<Vista>("unidad");
  const [unidadId, setUnidadId] = useState(unidades[0]?.id ?? "");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(0);

  const actividadesDeUnidad = useMemo(
    () => actividades.filter((actividad) => actividad.unidad_id === unidadId).sort((a, b) => a.orden - b.orden),
    [actividades, unidadId],
  );
  const estudiantesFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase("es-MX");
    return estudiantes.filter((estudiante) => !termino || estudiante.nombre.toLocaleLowerCase("es-MX").includes(termino));
  }, [busqueda, estudiantes]);
  const tamanoPagina = 10;
  const totalPaginas = Math.max(1, Math.ceil(estudiantesFiltrados.length / tamanoPagina));
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const estudiantesPagina = estudiantesFiltrados.slice(paginaActual * tamanoPagina, (paginaActual + 1) * tamanoPagina);
  const entregaPorClave = useMemo(
    () => new Map(entregas.map((entrega) => [`${entrega.estudiante_id}:${entrega.actividad_id}`, entrega])),
    [entregas],
  );
  const confianzaUnidadPorClave = useMemo(
    () => new Map(confianzas.filter((confianza) => confianza.momento === "inicio").map((confianza) => [`${confianza.estudiante_id}:${confianza.unidad_id}`, confianza.valor])),
    [confianzas],
  );
  const confianzaActividadPorClave = useMemo(
    () => new Map(
      reflexiones
        .filter((reflexion) => reflexion.momento === "prediccion" && reflexion.actividad_id && reflexion.confianza !== null)
        .map((reflexion) => [`${reflexion.estudiante_id}:${reflexion.actividad_id}`, reflexion.confianza!]),
    ),
    [reflexiones],
  );
  const reflexionActividadPorClave = useMemo(
    () => new Map(
      reflexiones
        .filter((reflexion) => reflexion.momento === "cierre" && reflexion.actividad_id && reflexion.texto)
        .map((reflexion) => [`${reflexion.estudiante_id}:${reflexion.actividad_id}`, reflexion.texto!]),
    ),
    [reflexiones],
  );
  const reflexionUnidadPorClave = useMemo(
    () => new Map(
      reflexiones
        .filter((reflexion) => reflexion.momento === "cierre" && reflexion.unidad_id && !reflexion.actividad_id && reflexion.texto)
        .map((reflexion) => [`${reflexion.estudiante_id}:${reflexion.unidad_id}`, reflexion.texto!]),
    ),
    [reflexiones],
  );
  const metaPorClave = useMemo(
    () => new Map(bitacoras.map((bitacora) => [`${bitacora.estudiante_id}:${bitacora.unidad_id}`, bitacora.meta])),
    [bitacoras],
  );

  const unidadSeleccionada = unidades.find((unidad) => unidad.id === unidadId);

  return (
    <section id="seguimiento" className="scroll-mt-20 flex flex-col gap-3" aria-labelledby="seguimiento-titulo">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="seguimiento-titulo" className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Seguimiento
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Confianza, expectativas y resultados por unidad.
          </p>
        </div>
        {estudiantes.length > 0 && (
          <ExportarGrupo
            principal
            nombreGrupo={nombreGrupo}
            codigoGrupo={codigoGrupo}
            estudiantes={estudiantes}
            unidades={unidades}
            actividades={actividades}
            entregas={entregas}
            confianzas={confianzas}
            reflexiones={reflexiones}
            bitacoras={bitacoras}
          />
        )}
      </div>

      {unidades.length === 0 ? (
        <Card className="p-5 text-sm text-slate-600 dark:text-slate-400">Aún no hay unidades para consultar.</Card>
      ) : (
        <Card className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="grid gap-2 lg:grid-cols-[minmax(15rem,0.8fr)_minmax(22rem,1.2fr)]">
            <label>
              <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Unidad</span>
              <Select value={unidadId} onChange={(event) => { setUnidadId(event.target.value); setPagina(0); }}>
                {unidades.map((unidad) => (
                  <option key={unidad.id} value={unidad.id}>Unidad {unidad.orden}. {unidad.nombre}</option>
                ))}
              </Select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Buscar estudiante</span>
              <Input value={busqueda} onChange={(event) => { setBusqueda(event.target.value); setPagina(0); }} placeholder="Nombre del estudiante" />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de seguimiento">
              <button
                type="button"
                aria-pressed={vista === "unidad"}
                onClick={() => { setVista("unidad"); setPagina(0); }}
                className={`min-h-10 rounded-lg px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${vista === "unidad" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"}`}
              >
                Por unidad
              </button>
              <button
                type="button"
                aria-pressed={vista === "actividad"}
                onClick={() => { setVista("actividad"); setPagina(0); }}
                className={`min-h-10 rounded-lg px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${vista === "actividad" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"}`}
              >
                Por actividad
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
          {vista === "unidad" ? (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                1/5 equivale a 0 %, 5/5 a 100 %; hasta 25 puntos de diferencia se considera cercana.
              </p>
              {estudiantesFiltrados.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-400">No hay estudiantes con ese nombre.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full min-w-[1080px] table-fixed text-sm">
                    <colgroup>
                      <col className="w-[19%]" />
                      <col className="w-[12%]" />
                      <col className="w-[15%]" />
                      <col className="w-[18%]" />
                      <col className="w-[36%]" />
                    </colgroup>
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                      <tr>
                        <th className="px-3 py-3">Estudiante</th>
                        <th className="px-3 py-3">Confianza inicial</th>
                        <th className="px-3 py-3">Resultado promedio</th>
                        <th className="px-3 py-3">Comparación</th>
                        <th className="px-3 py-3">Apertura y reflexión</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {estudiantesPagina.map((estudiante) => {
                        const confianza = confianzaUnidadPorClave.get(`${estudiante.id}:${unidadId}`) ?? null;
                        const puntajes = actividadesDeUnidad
                          .map((actividad) => entregaPorClave.get(`${estudiante.id}:${actividad.id}`)?.puntaje_auto ?? null)
                          .filter((puntaje): puntaje is number => puntaje !== null);
                        const promedio = puntajes.length > 0 ? Math.round(puntajes.reduce((total, puntaje) => total + puntaje, 0) / puntajes.length) : null;
                        const comparacion = etiquetaCalibracion(confianza, promedio);
                        const expectativa = metaPorClave.get(`${estudiante.id}:${unidadId}`);
                        const reflexion = reflexionUnidadPorClave.get(`${estudiante.id}:${unidadId}`);

                        return (
                          <tr key={estudiante.id} className="align-top">
                            <th scope="row" className="px-3 py-3 text-left font-medium">
                              <Link href={`/docente/estudiantes/${estudiante.id}`} className="text-indigo-700 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-900 dark:text-indigo-300 dark:decoration-indigo-800">
                                {estudiante.nombre}
                              </Link>
                            </th>
                            <td className="px-3 py-3 text-slate-700 dark:text-slate-300">{confianza === null ? "Sin registro" : `${confianza}/5`}</td>
                            <td className="px-3 py-3 text-slate-700 dark:text-slate-300">
                              {promedio === null ? "Sin resultados" : <><strong className="text-slate-900 dark:text-slate-50">{promedio}%</strong><span className="ml-1 text-xs text-slate-500">({puntajes.length} actividades)</span></>}
                            </td>
                            <td className="px-3 py-3">
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${comparacion.clases}`}>{comparacion.texto}</span>
                            </td>
                            <td className="px-3 py-3">
                              <details className="group">
                                <summary className="cursor-pointer font-medium text-indigo-700 underline decoration-indigo-200 underline-offset-2 dark:text-indigo-300 dark:decoration-indigo-800">
                                  Ver expectativa y reflexión
                                </summary>
                                <div className="mt-2 flex flex-col gap-2 text-sm">
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Lo que esperaba aprender</p>
                                    <p className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{expectativa || "Sin expectativa registrada"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Reflexión de cierre</p>
                                    <p className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{reflexion || "Sin reflexión de cierre"}</p>
                                  </div>
                                </div>
                              </details>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cada celda muestra el porcentaje guardado y la confianza previa cuando existe. Desplázate horizontalmente para recorrer actividades; 1/5 equivale a 0% y 5/5 a 100% en la comparación.
              </p>
              {estudiantesFiltrados.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-400">No hay estudiantes con ese nombre.</p>
              ) : actividadesDeUnidad.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-400">Esta unidad aún no tiene actividades.</p>
              ) : (
                <div className="overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full min-w-max text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                      <tr>
                        <th className="sticky left-0 z-10 min-w-44 border-r border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800">Estudiante</th>
                        {actividadesDeUnidad.map((actividad) => (
                          <th key={actividad.id} className="min-w-40 max-w-56 px-3 py-3">{actividad.titulo}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {estudiantesPagina.map((estudiante) => (
                        <tr key={estudiante.id}>
                          <th scope="row" className="sticky left-0 z-10 border-r border-slate-200 bg-white px-3 py-3 text-left font-medium dark:border-slate-700 dark:bg-slate-900">
                            <Link href={`/docente/estudiantes/${estudiante.id}`} className="text-indigo-700 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-900 dark:text-indigo-300 dark:decoration-indigo-800">
                              {estudiante.nombre}
                            </Link>
                          </th>
                          {actividadesDeUnidad.map((actividad) => {
                            const clave = `${estudiante.id}:${actividad.id}`;
                            const entrega = entregaPorClave.get(clave);
                            const confianza = confianzaActividadPorClave.get(clave) ?? null;
                            const reflexion = reflexionActividadPorClave.get(clave);
                            const resultado = entrega?.puntaje_auto ?? null;
                            const comparacion = etiquetaCalibracion(confianza, resultado);
                            return (
                              <td key={actividad.id} className="px-3 py-3 align-top">
                                <div className="flex min-h-16 flex-col gap-1.5">
                                  <span className="font-semibold text-slate-900 dark:text-slate-50">
                                    {!entrega ? "Sin entrega" : resultado === null ? "Sin % automático" : `${resultado}%`}
                                  </span>
                                  {confianza !== null && <span className="text-xs text-slate-500 dark:text-slate-400">Confianza: {confianza}/5</span>}
                                  {confianza !== null && resultado !== null && (
                                    <span className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${comparacion.clases}`}>
                                      {comparacion.texto}
                                    </span>
                                  )}
                                  {reflexion ? (
                                    <details className="text-xs">
                                      <summary className="cursor-pointer text-indigo-700 underline decoration-indigo-200 underline-offset-2 dark:text-indigo-300 dark:decoration-indigo-800">Leer reflexión</summary>
                                      <p className="mt-1 max-w-64 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{reflexion}</p>
                                    </details>
                                  ) : entrega ? (
                                    <span className="text-xs text-slate-400 dark:text-slate-500">Sin reflexión</span>
                                  ) : null}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {estudiantesFiltrados.length > tamanoPagina && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPagina((actual) => Math.max(0, actual - 1))}
                disabled={paginaActual === 0}
                className="min-h-10 rounded-lg px-3 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:text-slate-400 dark:text-indigo-300 dark:hover:bg-slate-800 dark:disabled:text-slate-600"
              >
                Anterior
              </button>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Mostrando {paginaActual * tamanoPagina + 1}–{Math.min((paginaActual + 1) * tamanoPagina, estudiantesFiltrados.length)} de {estudiantesFiltrados.length} estudiantes · Página {paginaActual + 1} de {totalPaginas}
              </span>
              <button
                type="button"
                onClick={() => setPagina((actual) => Math.min(totalPaginas - 1, actual + 1))}
                disabled={paginaActual + 1 >= totalPaginas}
                className="min-h-10 rounded-lg px-3 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:text-slate-400 dark:text-indigo-300 dark:hover:bg-slate-800 dark:disabled:text-slate-600"
              >
                Siguiente
              </button>
            </div>
          )}
          </div>

          {unidadSeleccionada && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Los porcentajes corresponden a los resultados guardados. En actividades sin calificación automática se muestra “Sin % automático”.
            </p>
          )}
        </Card>
      )}
    </section>
  );
}
