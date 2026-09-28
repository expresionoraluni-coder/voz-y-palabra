"use client";

const CLAVE_PREFERENCIAS = "voz-y-palabra-preferencias-privacidad";

export type PreferenciasPrivacidad = {
  version: 1;
  medicion: boolean;
  actualizadoEn: string;
};

export function leerPreferenciasPrivacidad(): PreferenciasPrivacidad | null {
  try {
    const valor = window.localStorage.getItem(CLAVE_PREFERENCIAS);
    if (!valor) return null;
    const preferencias = JSON.parse(valor) as Partial<PreferenciasPrivacidad>;
    if (preferencias.version !== 1 || typeof preferencias.medicion !== "boolean") return null;
    return {
      version: 1,
      medicion: preferencias.medicion,
      actualizadoEn: typeof preferencias.actualizadoEn === "string" ? preferencias.actualizadoEn : "",
    };
  } catch {
    return null;
  }
}

export function guardarPreferenciasPrivacidad(medicion: boolean) {
  const preferencias: PreferenciasPrivacidad = {
    version: 1,
    medicion,
    actualizadoEn: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(CLAVE_PREFERENCIAS, JSON.stringify(preferencias));
  } catch {
    // La plataforma sigue funcionando si el navegador bloquea el almacenamiento local.
  }
  window.dispatchEvent(new CustomEvent("voz-y-palabra:preferencias-privacidad", { detail: preferencias }));
}

export function permiteMedicionDeUso() {
  return leerPreferenciasPrivacidad()?.medicion === true;
}

export const eventoAbrirPreferencias = "voz-y-palabra:abrir-preferencias";
