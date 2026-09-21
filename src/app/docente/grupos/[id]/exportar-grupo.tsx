"use client";

import { useState } from "react";
import { Check, Download } from "lucide-react";
import Boton from "@/components/ui/button";
import type { EstudianteResumen } from "./grupo-estudiantes-panel";
import type {
  ActividadSeguimiento,
  BitacoraSeguimiento,
  ConfianzaSeguimiento,
  EntregaSeguimiento,
  ReflexionSeguimiento,
  UnidadSeguimiento,
} from "./tipos-seguimiento";

type ValorCelda = string | number;

function escaparXml(valor: ValorCelda): string {
  return String(valor).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "").replace(/[<>&'\"]/g, (caracter) => {
    const entidades: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return entidades[caracter];
  });
}

function columnaExcel(indice: number): string {
  let resultado = "";
  let numero = indice + 1;
  while (numero > 0) {
    const resto = (numero - 1) % 26;
    resultado = String.fromCharCode(65 + resto) + resultado;
    numero = Math.floor((numero - 1) / 26);
  }
  return resultado;
}

function celdaXml(ref: string, valor: ValorCelda, estilo: number): string {
  if (typeof valor === "number" && Number.isFinite(valor)) {
    return `<c r="${ref}" s="${estilo}"><v>${valor}</v></c>`;
  }
  return `<c r="${ref}" s="${estilo}" t="inlineStr"><is><t xml:space="preserve">${escaparXml(valor)}</t></is></c>`;
}

function u16(valor: number): Uint8Array {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, valor, true);
  return bytes;
}

function u32(valor: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, valor >>> 0, true);
  return bytes;
}

function unir(partes: Uint8Array[]): Uint8Array {
  const total = partes.reduce((suma, parte) => suma + parte.length, 0);
  const resultado = new Uint8Array(total);
  let posicion = 0;
  for (const parte of partes) {
    resultado.set(parte, posicion);
    posicion += parte.length;
  }
  return resultado;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Crea un XLSX mínimo sin depender de una librería externa. */
function crearXlsx(archivos: Array<{ nombre: string; contenido: string }>): Uint8Array {
  const encoder = new TextEncoder();
  const locales: Uint8Array[] = [];
  const centrales: Uint8Array[] = [];
  let desplazamiento = 0;

  for (const archivo of archivos) {
    const nombre = encoder.encode(archivo.nombre);
    const contenido = encoder.encode(archivo.contenido);
    const suma = crc32(contenido);
    const local = unir([
      Uint8Array.from([0x50, 0x4b, 0x03, 0x04]),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(0),
      u16(0),
      u32(suma),
      u32(contenido.length),
      u32(contenido.length),
      u16(nombre.length),
      u16(0),
      nombre,
      contenido,
    ]);
    locales.push(local);

    centrales.push(
      unir([
        Uint8Array.from([0x50, 0x4b, 0x01, 0x02]),
        u16(20),
        u16(20),
        u16(0x0800),
        u16(0),
        u16(0),
        u16(0),
        u32(suma),
        u32(contenido.length),
        u32(contenido.length),
        u16(nombre.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(desplazamiento),
        nombre,
      ]),
    );
    desplazamiento += local.length;
  }

  const bloqueCentral = unir(centrales);
  const fin = unir([
    Uint8Array.from([0x50, 0x4b, 0x05, 0x06]),
    u16(0),
    u16(0),
    u16(archivos.length),
    u16(archivos.length),
    u32(bloqueCentral.length),
    u32(desplazamiento),
    u16(0),
  ]);
  return unir([...locales, bloqueCentral, fin]);
}

type HojaLibro = {
  nombre: string;
  titulo: string;
  subtitulo: string;
  filas: ValorCelda[][];
  anchos: number[];
  columnasPorcentaje?: number[];
  columnasTextoLargo?: number[];
  filaResumen?: number;
};

function estiloCelda(hoja: HojaLibro, valor: ValorCelda, indiceFila: number, indiceColumna: number): number {
  if (indiceFila === 0) return 1;
  if (typeof valor === "number" && hoja.columnasPorcentaje?.includes(indiceColumna)) {
    if (valor >= 70) return 6;
    if (valor >= 40) return 7;
    return 8;
  }
  if (valor === "—") return 9;
  if (hoja.filaResumen === indiceFila) return 10;
  if (hoja.columnasTextoLargo?.includes(indiceColumna)) return 2;
  return 0;
}

function xmlHoja(hoja: HojaLibro): string {
  const { filas } = hoja;
  const ancho = Math.max(1, ...filas.map((fila) => fila.length));
  const ultimaColumna = columnaExcel(ancho - 1);
  const filasConTitulo = [
    `<row r="1" ht="28" customHeight="1">${celdaXml("A1", hoja.titulo, 3)}</row>`,
    `<row r="2" ht="20" customHeight="1">${celdaXml("A2", hoja.subtitulo, 4)}</row>`,
  ];
  const filasDatos = filas.map((fila, indiceFila) => {
    const numeroFila = indiceFila + 4;
    const altura = hoja.columnasTextoLargo?.length && indiceFila > 0 ? ' ht="48" customHeight="1"' : "";
    return `<row r="${numeroFila}"${altura}>${fila
      .map((valor, indiceColumna) => celdaXml(`${columnaExcel(indiceColumna)}${numeroFila}`, valor, estiloCelda(hoja, valor, indiceFila, indiceColumna)))
      .join("")}</row>`;
  });
  const anchos = Array.from({ length: ancho }, (_, indice) => hoja.anchos[indice] ?? 20);
  const columnas = `<cols>${anchos.map((anchoColumna, indice) => `<col min="${indice + 1}" max="${indice + 1}" width="${anchoColumna}" customWidth="1"/>`).join("")}</cols>`;
  const congelarNombreYEncabezado =
    '<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane xSplit="1" ySplit="4" topLeftCell="B5" activePane="bottomRight" state="frozen"/><selection pane="bottomRight" activeCell="B5" sqref="B5"/></sheetView></sheetViews>';
  const filtro = filas.length > 1 ? `<autoFilter ref="A4:${ultimaColumna}${filas.length + 3}"/>` : "";
  const combinaciones = ancho > 1
    ? `<mergeCells count="2"><mergeCell ref="A1:${ultimaColumna}1"/><mergeCell ref="A2:${ultimaColumna}2"/></mergeCells>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${congelarNombreYEncabezado}<sheetFormatPr defaultRowHeight="18"/>${columnas}<sheetData>${[...filasConTitulo, ...filasDatos].join("")}</sheetData>${filtro}${combinaciones}</worksheet>`;
}

function clave(estudianteId: string, recursoId: string): string {
  return `${estudianteId}:${recursoId}`;
}

function fechaExportable(fecha: string | null): string {
  if (!fecha) return "";
  const date = new Date(fecha);
  return Number.isNaN(date.getTime())
    ? fecha
    : date.toLocaleDateString("es-MX", { timeZone: "America/Mexico_City" });
}

function etiquetaComparacion(confianza: number | null, resultado: number | null): string {
  if (confianza === null || resultado === null) return "Sin datos comparables";
  const confianzaPorcentaje = (confianza - 1) * 25;
  if (confianzaPorcentaje - resultado > 25) return "Confianza mayor al resultado";
  if (confianzaPorcentaje - resultado < -25) return "Resultado mayor a la confianza";
  return "Confianza y resultado alineados";
}

function etiquetaExpectativaActividad(expectativa: number | null, resultado: number | null): string {
  if (expectativa === null || resultado === null) return "Sin datos comparables";
  const expectativaPorcentaje = (expectativa - 1) * 25;
  if (expectativaPorcentaje - resultado > 25) return "Expectativa mayor al resultado";
  if (expectativaPorcentaje - resultado < -25) return "Resultado mayor a la expectativa";
  return "Expectativa y resultado alineados";
}

function filasLibro({
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
}): HojaLibro[] {
  const actividadesOrdenadas = [...actividades].sort((a, b) => {
    const ordenUnidadA = unidades.find((unidad) => unidad.id === a.unidad_id)?.orden ?? 0;
    const ordenUnidadB = unidades.find((unidad) => unidad.id === b.unidad_id)?.orden ?? 0;
    return ordenUnidadA - ordenUnidadB || a.orden - b.orden;
  });
  const entregaPorClave = new Map(entregas.map((entrega) => [clave(entrega.estudiante_id, entrega.actividad_id), entrega]));
  const confianzaUnidadPorClave = new Map(
    confianzas
      .filter((confianza) => confianza.momento === "inicio")
      .map((confianza) => [clave(confianza.estudiante_id, confianza.unidad_id), confianza.valor]),
  );
  const reflexionUnidadPorClave = new Map(
    reflexiones
      .filter((reflexion) => reflexion.momento === "cierre" && reflexion.unidad_id && !reflexion.actividad_id && reflexion.texto)
      .map((reflexion) => [clave(reflexion.estudiante_id, reflexion.unidad_id!), reflexion]),
  );
  const expectativaActividadPorClave = new Map(
    reflexiones
      .filter((reflexion) => reflexion.momento === "prediccion" && reflexion.actividad_id && reflexion.confianza !== null)
      .map((reflexion) => [clave(reflexion.estudiante_id, reflexion.actividad_id!), reflexion.confianza]),
  );
  const reflexionActividadPorClave = new Map(
    reflexiones
      .filter((reflexion) => reflexion.momento === "cierre" && reflexion.actividad_id && reflexion.texto)
      .map((reflexion) => [clave(reflexion.estudiante_id, reflexion.actividad_id!), reflexion.texto]),
  );
  const metaPorClave = new Map(bitacoras.map((bitacora) => [clave(bitacora.estudiante_id, bitacora.unidad_id), bitacora.meta]));
  const unidadesOrdenadas = [...unidades].sort((a, b) => a.orden - b.orden);
  const comparaciones = estudiantes.flatMap((estudiante) => unidadesOrdenadas.map((unidad) => {
    const actividadesUnidad = actividadesOrdenadas.filter((actividad) => actividad.unidad_id === unidad.id);
    const puntajes = actividadesUnidad
      .map((actividad) => entregaPorClave.get(clave(estudiante.id, actividad.id))?.puntaje_auto ?? null)
      .filter((puntaje): puntaje is number => puntaje !== null);
    const resultado = puntajes.length > 0 ? Math.round(puntajes.reduce((total, puntaje) => total + puntaje, 0) / puntajes.length) : null;
    const confianza = confianzaUnidadPorClave.get(clave(estudiante.id, unidad.id)) ?? null;
    return { estudiante, unidad, actividadesUnidad, puntajes, resultado, confianza };
  }));
  const comparables = comparaciones.filter((comparacion) => comparacion.confianza !== null && comparacion.resultado !== null);
  const comparacionesCercanas = comparables.filter((comparacion) => etiquetaComparacion(comparacion.confianza, comparacion.resultado) === "Confianza y resultado alineados").length;
  const calibracionPorcentaje = comparables.length > 0
    ? Math.round((comparacionesCercanas / comparables.length) * 100)
    : null;
  const comparacionesActividad = estudiantes.flatMap((estudiante) => actividadesOrdenadas.map((actividad) => {
    const expectativa = expectativaActividadPorClave.get(clave(estudiante.id, actividad.id)) ?? null;
    const resultado = entregaPorClave.get(clave(estudiante.id, actividad.id))?.puntaje_auto ?? null;
    return {
      estudiante,
      actividad,
      unidad: unidades.find((unidad) => unidad.id === actividad.unidad_id),
      expectativa,
      resultado,
      reflexion: reflexionActividadPorClave.get(clave(estudiante.id, actividad.id)) ?? null,
    };
  }));
  const comparablesActividad = comparacionesActividad.filter((comparacion) => comparacion.expectativa !== null && comparacion.resultado !== null);
  const comparacionesActividadCercanas = comparablesActividad.filter((comparacion) => etiquetaExpectativaActividad(comparacion.expectativa, comparacion.resultado) === "Expectativa y resultado alineados").length;
  const calibracionActividadPorcentaje = comparablesActividad.length > 0
    ? Math.round((comparacionesActividadCercanas / comparablesActividad.length) * 100)
    : null;
  const participantesSemana = estudiantes.filter((estudiante) => estudiante.diasInactivo !== null && estudiante.diasInactivo <= 7).length;
  const avancePromedio = estudiantes.length > 0
    ? Math.round(estudiantes.reduce((total, estudiante) => total + estudiante.avance, 0) / estudiantes.length)
    : 0;
  const fechaDeExportacion = new Date().toLocaleDateString("es-MX", { timeZone: "America/Mexico_City" });

  const resumen: HojaLibro = {
    nombre: "Resumen",
    titulo: `Resumen del grupo · ${nombreGrupo}`,
    subtitulo: `Código de acceso: ${codigoGrupo} · Generado el ${fechaDeExportacion}`,
    filas: [
      ["Indicador", "Valor", "Cómo leerlo"],
      ["Estudiantes activos", estudiantes.length, "Incluidos en este archivo."],
      ["Participación en 7 días", `${participantesSemana}/${estudiantes.length}`, "Al menos una entrega en los últimos 7 días."],
      ["Avance promedio", `${avancePromedio}%`, "Promedio de actividades completas entre las que ya se abrieron."],
      ["Calibración por unidad", calibracionPorcentaje === null ? "Sin datos" : `${calibracionPorcentaje}%`, "Porcentaje de comparaciones entre seguridad inicial y resultado promedio que quedaron cercanas."],
      ["Calibración por actividad", calibracionActividadPorcentaje === null ? "Sin datos" : `${calibracionActividadPorcentaje}%`, "Porcentaje de comparaciones entre expectativa numérica y resultado que quedaron cercanas."],
    ],
    anchos: [32, 22, 76],
    columnasTextoLargo: [2],
  };

  const hojaEstudiantes: HojaLibro = {
    nombre: "Estudiantes",
    titulo: `Estudiantes · ${nombreGrupo}`,
    subtitulo: "Avance calculado solo con actividades abiertas al momento de exportar.",
    filas: [
      ["Estudiante", "Avance abierto (%)", "Entregas registradas", "Última entrega", "Participó en 7 días", "Días sin actividad"],
      ...estudiantes.map((estudiante) => [
        estudiante.nombre,
        estudiante.avance,
        estudiante.totalEntregas,
        estudiante.ultima ? fechaExportable(new Date(estudiante.ultima).toISOString()) : "—",
        estudiante.diasInactivo !== null && estudiante.diasInactivo <= 7 ? "Sí" : "No",
        estudiante.diasInactivo ?? "—",
      ]),
    ],
    anchos: [32, 19, 20, 20, 22, 20],
    columnasPorcentaje: [1],
  };

  const hojasAciertos = unidadesOrdenadas.map((unidad) => {
    const actividadesUnidad = actividadesOrdenadas.filter((actividad) => actividad.unidad_id === unidad.id);
    const filasAciertos: ValorCelda[][] = [
      ["Estudiante", ...actividadesUnidad.map((actividad) => actividad.titulo), "Promedio"],
      ...estudiantes.map((estudiante) => {
        const puntajes = actividadesUnidad
          .map((actividad) => entregaPorClave.get(clave(estudiante.id, actividad.id))?.puntaje_auto ?? null)
          .filter((puntaje): puntaje is number => puntaje !== null);
        const promedio = puntajes.length > 0 ? Math.round(puntajes.reduce((total, puntaje) => total + puntaje, 0) / puntajes.length) : "—";
        return [
          estudiante.nombre,
          ...actividadesUnidad.map((actividad) => entregaPorClave.get(clave(estudiante.id, actividad.id))?.puntaje_auto ?? "—"),
          promedio,
        ];
      }),
    ];
    const promediosPorActividad = actividadesUnidad.map((actividad) => {
      const puntajes = estudiantes
        .map((estudiante) => entregaPorClave.get(clave(estudiante.id, actividad.id))?.puntaje_auto ?? null)
        .filter((puntaje): puntaje is number => puntaje !== null);
      return puntajes.length > 0 ? Math.round(puntajes.reduce((total, puntaje) => total + puntaje, 0) / puntajes.length) : "—";
    });
    const promediosUnidad = filasAciertos.slice(1).map((fila) => fila.at(-1)).filter((valor): valor is number => typeof valor === "number");
    filasAciertos.push([
      "Promedio del grupo",
      ...promediosPorActividad,
      promediosUnidad.length > 0 ? Math.round(promediosUnidad.reduce((total, promedio) => total + promedio, 0) / promediosUnidad.length) : "—",
    ]);
    return {
      nombre: `U${unidad.orden} aciertos`,
      titulo: `Aciertos por actividad · Unidad ${unidad.orden}`,
      subtitulo: `${unidad.nombre}. Cada porcentaje es el resultado automático guardado; “—” indica que aún no hay resultado automático.`,
      filas: filasAciertos,
      anchos: [32, ...actividadesUnidad.map(() => 26), 16],
      columnasPorcentaje: Array.from({ length: actividadesUnidad.length + 1 }, (_, indice) => indice + 1),
      filaResumen: filasAciertos.length - 1,
    } satisfies HojaLibro;
  });

  const confianzaResultados: HojaLibro = {
    nombre: "Confianza y resultados",
    titulo: `Confianza y resultados · ${nombreGrupo}`,
    subtitulo: "La comparación usa la confianza inicial de 1 a 5 y el promedio de resultados automáticos de cada unidad.",
    filas: [
      ["Estudiante", "Unidad", "Confianza inicial (1–5)", "Resultado promedio (%)", "Actividades con resultado", "Comparación"],
      ...comparaciones.map((comparacion) => [
        comparacion.estudiante.nombre,
        `Unidad ${comparacion.unidad.orden}. ${comparacion.unidad.nombre}`,
        comparacion.confianza ?? "—",
        comparacion.resultado ?? "—",
        `${comparacion.puntajes.length}/${comparacion.actividadesUnidad.length}`,
        etiquetaComparacion(comparacion.confianza, comparacion.resultado),
      ]),
    ],
    anchos: [32, 34, 24, 24, 25, 34],
    columnasPorcentaje: [3],
  };

  const expectativasYReflexiones: HojaLibro = {
    nombre: "Expectativas y reflexiones",
    titulo: `Expectativas y reflexiones · ${nombreGrupo}`,
    subtitulo: "Registros por estudiante y unidad. Los textos se muestran completos y con salto de línea.",
    filas: [
      ["Estudiante", "Unidad", "Lo que esperaba aprender", "Reflexión de cierre"],
      ...comparaciones.map((comparacion) => [
        comparacion.estudiante.nombre,
        `Unidad ${comparacion.unidad.orden}. ${comparacion.unidad.nombre}`,
        metaPorClave.get(clave(comparacion.estudiante.id, comparacion.unidad.id)) ?? "Sin expectativa registrada",
        reflexionUnidadPorClave.get(clave(comparacion.estudiante.id, comparacion.unidad.id))?.texto ?? "Sin reflexión de cierre",
      ]),
    ],
    anchos: [30, 30, 68, 68],
    columnasTextoLargo: [2, 3],
  };

  const seguimientoActividad: HojaLibro = {
    nombre: "Seguimiento por actividad",
    titulo: `Seguimiento por actividad · ${nombreGrupo}`,
    subtitulo: "La expectativa numérica se registra antes de iniciar la actividad; la reflexión se guarda después de conocer el resultado.",
    filas: [
      ["Estudiante", "Unidad", "Actividad", "Expectativa numérica (1–5)", "Equivalencia (%)", "Resultado (%)", "Comparación", "Reflexión metacognitiva"],
      ...comparacionesActividad.map((comparacion) => [
        comparacion.estudiante.nombre,
        comparacion.unidad ? `Unidad ${comparacion.unidad.orden}. ${comparacion.unidad.nombre}` : "Sin unidad",
        comparacion.actividad.titulo,
        comparacion.expectativa ?? "—",
        comparacion.expectativa === null ? "—" : (comparacion.expectativa - 1) * 25,
        comparacion.resultado ?? "—",
        etiquetaExpectativaActividad(comparacion.expectativa, comparacion.resultado),
        comparacion.reflexion ?? "Sin reflexión registrada",
      ]),
    ],
    anchos: [32, 30, 34, 28, 20, 18, 35, 72],
    columnasPorcentaje: [4, 5],
    columnasTextoLargo: [7],
  };

  return [resumen, hojaEstudiantes, ...hojasAciertos, seguimientoActividad, confianzaResultados, expectativasYReflexiones];
}

const ESTILOS_EXCEL = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="0&quot;%&quot;"/></numFmts><fonts count="5"><font><sz val="10"/><color rgb="FF1E293B"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Aptos"/></font><font><b/><color rgb="FF3730A3"/><sz val="16"/><name val="Aptos Display"/></font><font><i/><color rgb="FF64748B"/><sz val="10"/><name val="Aptos"/></font><font><b/><color rgb="FF1E293B"/><sz val="10"/><name val="Aptos"/></font></fonts><fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF4338CA"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCFCE7"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFEE2E2"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top style="thin"><color rgb="FFCBD5E1"/></top><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="11"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="164" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="164" fontId="0" fillId="4" borderId="0" xfId="0" applyFill="1" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="164" fontId="0" fillId="5" borderId="0" xfId="0" applyFill="1" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="3" fillId="6" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyBorder="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

function construirLibro(hojas: HojaLibro[]): Uint8Array {
  const partes: Array<{ nombre: string; contenido: string }> = [
    {
      nombre: "[Content_Types].xml",
      contenido: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${hojas.map((_, indice) => `<Override PartName="/xl/worksheets/sheet${indice + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
    },
    {
      nombre: "_rels/.rels",
      contenido: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    },
    {
      nombre: "xl/workbook.xml",
      contenido: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${hojas.map((hoja, indice) => `<sheet name="${escaparXml(hoja.nombre)}" sheetId="${indice + 1}" r:id="rId${indice + 1}"/>`).join("")}</sheets></workbook>`,
    },
    {
      nombre: "xl/_rels/workbook.xml.rels",
      contenido: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${hojas.map((_, indice) => `<Relationship Id="rId${indice + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${indice + 1}.xml"/>`).join("")}<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    { nombre: "xl/styles.xml", contenido: ESTILOS_EXCEL },
    ...hojas.map((hoja, indice) => ({
      nombre: `xl/worksheets/sheet${indice + 1}.xml`,
      contenido: xmlHoja(hoja),
    })),
  ];

  return crearXlsx(partes);
}

export default function ExportarGrupo({
  principal = false,
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
  principal?: boolean;
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
  const [estado, setEstado] = useState<"inactivo" | "preparando" | "listo" | "error">("inactivo");

  function exportar() {
    setEstado("preparando");
    try {
      const libro = construirLibro(filasLibro({ nombreGrupo, codigoGrupo, estudiantes, unidades, actividades, entregas, confianzas, reflexiones, bitacoras }));
      const bytes = new Uint8Array(libro);
      const blob = new Blob([bytes.buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `${nombreGrupo.replace(/[^\w-]+/g, "_")}_seguimiento.xlsx`;
      enlace.style.display = "none";
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      // Algunos navegadores cancelan la descarga si el objeto se libera en el
      // mismo ciclo que el clic. Se conserva el archivo temporal un minuto.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setEstado("listo");
      window.setTimeout(() => setEstado("inactivo"), 5_000);
    } catch {
      setEstado("error");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-live="polite">
      <Boton type="button" variant={principal ? "primary" : "secondary"} size={principal ? "md" : "sm"} onClick={exportar} cargando={estado === "preparando"}>
        {estado === "listo" ? <Check className="size-3.5" aria-hidden="true" /> : estado !== "preparando" ? <Download className="size-3.5" aria-hidden="true" /> : null}
        {estado === "preparando" ? "Preparando Excel…" : estado === "listo" ? "Descarga iniciada" : "Descargar Excel"}
      </Boton>
      {estado === "error" && <span role="status" className="text-xs text-red-600 dark:text-red-400">No se pudo preparar el archivo. Inténtalo de nuevo.</span>}
    </div>
  );
}
