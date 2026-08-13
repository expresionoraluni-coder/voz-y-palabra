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

function celdaExcel(valor: string | number): string {
  // Si la celda empieza con =, +, - o @, Excel puede interpretarla como
  // fórmula; se antepone un apóstrofo para tratarla como texto literal.
  let texto = String(valor);
  if (/^[=+\-@]/.test(texto)) texto = `'${texto}`;
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default function ExportarGrupo({
  nombreGrupo,
  estudiantes,
}: {
  nombreGrupo: string;
  estudiantes: FilaEstudiante[];
}) {
  function exportar() {
    const encabezados = ["Nombre", "Avance (%)", "Entregas", "Última actividad", "Días sin actividad"];
    const filas = estudiantes.map((e) => [
      e.nombre,
      e.avance,
      e.totalEntregas,
      e.ultima ? new Date(e.ultima).toLocaleDateString("es-MX") : "Sin actividad",
      e.diasInactivo ?? "—",
    ]);
    // El BOM ayuda a que Excel detecte correctamente los acentos.
    const excel =
      "﻿" +
      `<table><thead><tr>${encabezados.map((encabezado) => `<th>${celdaExcel(encabezado)}</th>`).join("")}</tr></thead><tbody>${filas
        .map((fila) => `<tr>${fila.map((valor) => `<td>${celdaExcel(valor)}</td>`).join("")}</tr>`)
        .join("")}</tbody></table>`;

    const blob = new Blob([excel], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nombreGrupo.replace(/[^\w-]+/g, "_")}_estudiantes.xls`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Boton type="button" variant="secondary" size="sm" onClick={exportar}>
      <Download className="size-3.5" aria-hidden="true" />
      Exportar a Excel
    </Boton>
  );
}
