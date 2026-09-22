"use client";

type CodigoDiagnosticoEntrega =
  | "validacion_justificacion"
  | "guardado_rechazado"
  | "guardado_sin_conexion";

type DiagnosticoEntrega = {
  actividadId: string;
  codigo: CodigoDiagnosticoEntrega;
  registradoEn: number;
};

const CLAVE = "voz-y-palabra:diagnostico-entrega";
const VIGENCIA_MS = 30 * 60 * 1000;

function leerDiagnostico(): DiagnosticoEntrega | null {
  if (typeof window === "undefined") return null;
  try {
    const valor = JSON.parse(window.sessionStorage.getItem(CLAVE) ?? "null") as DiagnosticoEntrega | null;
    if (!valor || typeof valor.actividadId !== "string" || typeof valor.codigo !== "string" || typeof valor.registradoEn !== "number") return null;
    if (Date.now() - valor.registradoEn > VIGENCIA_MS) {
      window.sessionStorage.removeItem(CLAVE);
      return null;
    }
    return valor;
  } catch {
    return null;
  }
}

export function registrarDiagnosticoDeEntrega(actividadId: string, codigo: CodigoDiagnosticoEntrega) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CLAVE, JSON.stringify({ actividadId, codigo, registradoEn: Date.now() } satisfies DiagnosticoEntrega));
  } catch {
    // El reporte sigue funcionando aunque el navegador no permita almacenamiento local.
  }
}

export function registrarDiagnosticoDeEntregaActual(codigo: Exclude<CodigoDiagnosticoEntrega, "validacion_justificacion">) {
  const actividadId = window.location.pathname.match(/\/estudiante\/actividad\/([0-9a-f-]{36})(?:\/|$)/i)?.[1];
  if (actividadId) registrarDiagnosticoDeEntrega(actividadId, codigo);
}

export function limpiarDiagnosticoDeEntregaActual() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(CLAVE);
  } catch {
    // No hay nada más que limpiar.
  }
}

export function diagnosticoDeEntregaParaReporte(actividadId: string | null) {
  const diagnostico = leerDiagnostico();
  if (!diagnostico || diagnostico.actividadId !== actividadId) return null;
  return diagnostico.codigo;
}
