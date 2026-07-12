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

function celdaCSV(valor: string | number): string {
  const texto = String(valor);
  return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
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
    // ﻿: BOM para que Excel detecte UTF-8 y no rompa los acentos.
    const csv =
      "﻿" +
      [encabezados, ...filas].map((fila) => fila.map(celdaCSV).join(",")).join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nombreGrupo.replace(/[^\w-]+/g, "_")}_estudiantes.csv`;
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
