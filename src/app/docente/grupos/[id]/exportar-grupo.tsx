"use client";

import { Download } from "lucide-react";
import Boton from "@/components/ui/button";

type FilaEstudiante = {
  nombre: string;
  avance: number;
  totalEntregas: number;
  ultima: number | null;
  diasInactivo: number | null;
};

type ValorCelda = string | number;

function escaparXml(valor: ValorCelda): string {
  return String(valor).replace(/[<>&'\"]/g, (caracter) => {
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

function celdaXml(ref: string, valor: ValorCelda): string {
  if (typeof valor === "number" && Number.isFinite(valor)) {
    return `<c r="${ref}"><v>${valor}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escaparXml(valor)}</t></is></c>`;
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

function construirLibro(estudiantes: FilaEstudiante[]): Uint8Array {
  const encabezados: ValorCelda[] = ["Nombre", "Avance (%)", "Entregas", "Última actividad", "Días sin actividad"];
  const filas: ValorCelda[][] = [
    encabezados,
    ...estudiantes.map((estudiante) => [
      estudiante.nombre,
      estudiante.avance,
      estudiante.totalEntregas,
      estudiante.ultima ? new Date(estudiante.ultima).toLocaleDateString("es-MX") : "Sin actividad",
      estudiante.diasInactivo ?? "—",
    ]),
  ];
  const sheetData = filas
    .map(
      (fila, indiceFila) =>
        `<row r="${indiceFila + 1}">${fila
          .map((valor, indiceColumna) => celdaXml(`${columnaExcel(indiceColumna)}${indiceFila + 1}`, valor))
          .join("")}</row>`,
    )
    .join("");

  return crearXlsx([
    {
      nombre: "[Content_Types].xml",
      contenido:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    },
    {
      nombre: "_rels/.rels",
      contenido:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    },
    {
      nombre: "xl/workbook.xml",
      contenido:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Estudiantes" sheetId="1" r:id="rId1"/></sheets></workbook>',
    },
    {
      nombre: "xl/_rels/workbook.xml.rels",
      contenido:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    },
    {
      nombre: "xl/worksheets/sheet1.xml",
      contenido:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetData}</sheetData></worksheet>`,
    },
  ]);
}

export default function ExportarGrupo({
  nombreGrupo,
  estudiantes,
}: {
  nombreGrupo: string;
  estudiantes: FilaEstudiante[];
}) {
  function exportar() {
    const libro = construirLibro(estudiantes);
    const blob = new Blob([libro.buffer as ArrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `${nombreGrupo.replace(/[^\w-]+/g, "_")}_estudiantes.xlsx`;
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
