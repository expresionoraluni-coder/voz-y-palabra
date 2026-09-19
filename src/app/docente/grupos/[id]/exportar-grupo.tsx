"use client";

import { Download } from "lucide-react";
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

type HojaLibro = { nombre: string; filas: ValorCelda[][]; anchos: number[] };

function xmlHoja(hoja: HojaLibro): string {
  const { filas } = hoja;
  const ancho = Math.max(1, ...filas.map((fila) => fila.length));
  const ultimaColumna = columnaExcel(ancho - 1);
  const sheetData = filas
    .map((fila, indiceFila) =>
      `<row r="${indiceFila + 1}">${fila
        .map((valor, indiceColumna) => celdaXml(`${columnaExcel(indiceColumna)}${indiceFila + 1}`, valor, indiceFila === 0 ? 1 : 2))
        .join("")}</row>`,
    )
    .join("");
  const anchos = Array.from({ length: ancho }, (_, indice) => hoja.anchos[indice] ?? 20);
  const columnas = `<cols>${anchos.map((anchoColumna, indice) => `<col min="${indice + 1}" max="${indice + 1}" width="${anchoColumna}" customWidth="1"/>`).join("")}</cols>`;
  const congelarNombreYEncabezado =
    '<sheetViews><sheetView workbookViewId="0"><pane xSplit="1" ySplit="1" topLeftCell="B2" activePane="bottomRight" state="frozen"/><selection pane="bottomRight" activeCell="B2" sqref="B2"/></sheetView></sheetViews>';
  const filtro = filas.length > 1 ? `<autoFilter ref="A1:${ultimaColumna}${filas.length}"/>` : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${congelarNombreYEncabezado}<sheetFormatPr defaultRowHeight="18"/>${columnas}<sheetData>${sheetData}</sheetData>${filtro}</worksheet>`;
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

function filasLibro({
  estudiantes,
  unidades,
  actividades,
  entregas,
  confianzas,
  reflexiones,
  bitacoras,
}: {
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
  const unidadPorId = new Map(unidades.map((unidad) => [unidad.id, unidad]));
  const entregaPorClave = new Map(entregas.map((entrega) => [clave(entrega.estudiante_id, entrega.actividad_id), entrega]));
  const confianzaUnidadPorClave = new Map(
    confianzas
      .filter((confianza) => confianza.momento === "inicio")
      .map((confianza) => [clave(confianza.estudiante_id, confianza.unidad_id), confianza.valor]),
  );
  const confianzaActividadPorClave = new Map(
    reflexiones
      .filter((reflexion) => reflexion.momento === "prediccion" && reflexion.actividad_id && reflexion.confianza !== null)
      .map((reflexion) => [clave(reflexion.estudiante_id, reflexion.actividad_id!), reflexion.confianza!]),
  );
  const reflexionActividadPorClave = new Map(
    reflexiones
      .filter((reflexion) => reflexion.momento === "cierre" && reflexion.actividad_id && reflexion.texto)
      .map((reflexion) => [clave(reflexion.estudiante_id, reflexion.actividad_id!), reflexion]),
  );
  const reflexionUnidadPorClave = new Map(
    reflexiones
      .filter((reflexion) => reflexion.momento === "cierre" && reflexion.unidad_id && !reflexion.actividad_id && reflexion.texto)
      .map((reflexion) => [clave(reflexion.estudiante_id, reflexion.unidad_id!), reflexion]),
  );
  const metaPorClave = new Map(bitacoras.map((bitacora) => [clave(bitacora.estudiante_id, bitacora.unidad_id), bitacora.meta]));

  const resumen: ValorCelda[][] = [
    ["Estudiante", "Avance (%)", "Entregas", "Fecha de última entrega", "Días sin actividad"],
    ...estudiantes.map((estudiante) => [
      estudiante.nombre,
      estudiante.avance,
      estudiante.totalEntregas,
      estudiante.ultima ? fechaExportable(new Date(estudiante.ultima).toISOString()) : "Sin actividad",
      estudiante.diasInactivo ?? "—",
    ]),
  ];

  const aciertos: ValorCelda[][] = [
    ["Estudiante", ...actividadesOrdenadas.map((actividad) => {
      const unidad = unidadPorId.get(actividad.unidad_id);
      return `U${unidad?.orden ?? "?"} · ${actividad.titulo} · % aciertos`;
    })],
    ...estudiantes.map((estudiante) => [
      estudiante.nombre,
      ...actividadesOrdenadas.map((actividad) => {
        const entrega = entregaPorClave.get(clave(estudiante.id, actividad.id));
        if (!entrega) return "Sin entrega";
        return entrega.puntaje_auto === null ? "Sin % automático" : entrega.puntaje_auto;
      }),
    ]),
  ];

  const porUnidad: ValorCelda[][] = [
    ["Estudiante", "Unidad", "Confianza inicial (1–5)", "Resultado promedio (%)", "Actividades con resultado", "Expectativa de apertura", "Reflexión de cierre"],
  ];
  for (const estudiante of estudiantes) {
    for (const unidad of [...unidades].sort((a, b) => a.orden - b.orden)) {
      const actividadesUnidad = actividadesOrdenadas.filter((actividad) => actividad.unidad_id === unidad.id);
      const puntajes = actividadesUnidad
        .map((actividad) => entregaPorClave.get(clave(estudiante.id, actividad.id))?.puntaje_auto ?? null)
        .filter((puntaje): puntaje is number => puntaje !== null);
      const promedio = puntajes.length > 0 ? Math.round(puntajes.reduce((total, puntaje) => total + puntaje, 0) / puntajes.length) : "";
      const reflexion = reflexionUnidadPorClave.get(clave(estudiante.id, unidad.id));
      porUnidad.push([
        estudiante.nombre,
        `Unidad ${unidad.orden}. ${unidad.nombre}`,
        confianzaUnidadPorClave.get(clave(estudiante.id, unidad.id)) ?? "Sin registro",
        promedio,
        `${puntajes.length}/${actividadesUnidad.length}`,
        metaPorClave.get(clave(estudiante.id, unidad.id)) ?? "Sin expectativa registrada",
        reflexion?.texto ?? "Sin reflexión de cierre",
      ]);
    }
  }

  const detalleActividades: ValorCelda[][] = [
    ["Estudiante", "Unidad", "Actividad", "Tipo", "Confianza previa (1–5)", "Aciertos (%)", "Estado", "Reflexión de actividad", "Fecha de entrega"],
  ];
  for (const estudiante of estudiantes) {
    for (const actividad of actividadesOrdenadas) {
      const entrega = entregaPorClave.get(clave(estudiante.id, actividad.id));
      const confianza = confianzaActividadPorClave.get(clave(estudiante.id, actividad.id));
      const reflexion = reflexionActividadPorClave.get(clave(estudiante.id, actividad.id));
      const unidad = unidadPorId.get(actividad.unidad_id);
      detalleActividades.push([
        estudiante.nombre,
        unidad ? `Unidad ${unidad.orden}. ${unidad.nombre}` : "",
        actividad.titulo,
        actividad.tipo.replaceAll("_", " "),
        confianza ?? "Sin registro",
        entrega?.puntaje_auto ?? "",
        !entrega ? (confianza ? "Iniciada sin entrega" : "Sin entrega") : entrega.puntaje_auto === null ? "Sin % automático" : "Con resultado",
        reflexion?.texto ?? "Sin reflexión registrada",
        fechaExportable(entrega?.created_at ?? null),
      ]);
    }
  }

  return [
    { nombre: "Estudiantes", filas: resumen, anchos: [30, 14, 12, 20, 22] },
    { nombre: "Aciertos por actividad", filas: aciertos, anchos: [30, ...actividadesOrdenadas.map(() => 24)] },
    { nombre: "Por unidad", filas: porUnidad, anchos: [30, 26, 22, 22, 24, 52, 52] },
    { nombre: "Detalle actividades", filas: detalleActividades, anchos: [30, 26, 38, 24, 22, 16, 24, 58, 20] },
  ];
}

const ESTILOS_EXCEL = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF4F46E5"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

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
  nombreGrupo,
  estudiantes,
  unidades,
  actividades,
  entregas,
  confianzas,
  reflexiones,
  bitacoras,
}: {
  nombreGrupo: string;
  estudiantes: EstudianteResumen[];
  unidades: UnidadSeguimiento[];
  actividades: ActividadSeguimiento[];
  entregas: EntregaSeguimiento[];
  confianzas: ConfianzaSeguimiento[];
  reflexiones: ReflexionSeguimiento[];
  bitacoras: BitacoraSeguimiento[];
}) {
  function exportar() {
    const libro = construirLibro(filasLibro({ estudiantes, unidades, actividades, entregas, confianzas, reflexiones, bitacoras }));
    const blob = new Blob([libro.buffer as ArrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `${nombreGrupo.replace(/[^\w-]+/g, "_")}_seguimiento.xlsx`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <Boton type="button" variant="secondary" size="sm" onClick={exportar}>
      <Download className="size-3.5" aria-hidden="true" />
      Exportar a Excel
    </Boton>
  );
}
