"use client";

import { useCallback, useMemo, useState } from "react";

const PREFIJO_BORRADOR = "voz-y-palabra:borrador:v1:";
const MAXIMA_ANTIGUEDAD_BORRADOR_MS = 24 * 60 * 60 * 1000;
// Los textos definitivos ya tienen límites propios en servidor. El borrador
// local se queda por debajo de ellos para no llenar el almacenamiento del
// navegador en un equipo compartido.
const MAXIMO_CARACTERES_BORRADOR = 18 * 1024;

type EnvoltorioBorrador<T> = {
  version: 1;
  actualizadoEn: number;
  datos: T;
};

function claveBorrador(estudianteId: string, tipo: string, recursoId: string) {
  return `${PREFIJO_BORRADOR}${encodeURIComponent(estudianteId)}:${tipo}:${encodeURIComponent(recursoId)}`;
}

function esEnvoltorioBorrador<T>(valor: unknown): valor is EnvoltorioBorrador<T> {
  return Boolean(
    valor &&
      typeof valor === "object" &&
      (valor as { version?: unknown }).version === 1 &&
      "datos" in valor,
  );
}

function leerBorrador<T>(clave: string, habilitado: boolean): T | null {
  if (!habilitado || typeof window === "undefined") return null;
  try {
    const guardado = window.localStorage.getItem(clave);
    if (!guardado) return null;
    const analizado: unknown = JSON.parse(guardado);
    if (esEnvoltorioBorrador<T>(analizado)) {
      const antiguedad = Date.now() - analizado.actualizadoEn;
      if (!Number.isFinite(analizado.actualizadoEn) || antiguedad < 0 || antiguedad > MAXIMA_ANTIGUEDAD_BORRADOR_MS) {
        window.localStorage.removeItem(clave);
        return null;
      }
      return analizado.datos;
    }
    window.localStorage.removeItem(clave);
  } catch {
    // El formulario continúa sin borrador si el navegador lo bloquea o el
    // valor anterior está dañado.
  }
  return null;
}

/**
 * Conserva un texto que aún no se entrega solo en el navegador actual. No
 * consulta ni escribe Supabase; cada borrador se separa por estudiante y por
 * actividad/unidad y el formulario decide cuándo eliminarlo.
 */
export function useBorradorLocal<T>({
  estudianteId,
  tipo,
  recursoId,
  habilitado = true,
}: {
  estudianteId: string;
  tipo: string;
  recursoId: string;
  habilitado?: boolean;
}) {
  const clave = useMemo(
    () => claveBorrador(estudianteId, tipo, recursoId),
    [estudianteId, recursoId, tipo],
  );
  const [borrador, setBorrador] = useState<T | null>(() => leerBorrador<T>(clave, habilitado));

  const guardarBorrador = useCallback(
    (datos: T): boolean => {
      if (!habilitado) return false;
      try {
        const contenido = JSON.stringify({
          version: 1,
          actualizadoEn: Date.now(),
          datos,
        } satisfies EnvoltorioBorrador<T>);
        if (contenido.length > MAXIMO_CARACTERES_BORRADOR) return false;
        window.localStorage.setItem(clave, contenido);
        return true;
      } catch {
        return false;
      }
    },
    [clave, habilitado],
  );

  const borrarBorrador = useCallback(() => {
    try {
      window.localStorage.removeItem(clave);
    } catch {
      // El borrado es preventivo; si localStorage no está disponible no impide
      // la entrega ni el cierre de sesión.
    }
    setBorrador(null);
  }, [clave]);

  return { borrador, guardarBorrador, borrarBorrador };
}

/** Borra únicamente los borradores de Voz y Palabra del navegador actual. */
export function limpiarBorradoresLocales() {
  try {
    const claves = Array.from({ length: window.localStorage.length }, (_, indice) => window.localStorage.key(indice));
    claves.forEach((clave) => {
      if (!clave?.startsWith(PREFIJO_BORRADOR)) return;
      const valor = window.localStorage.getItem(clave);
      if (!valor) return;
      try {
        const analizado: unknown = JSON.parse(valor);
        if (
          !esEnvoltorioBorrador(analizado) ||
          !Number.isFinite(analizado.actualizadoEn) ||
          Date.now() - analizado.actualizadoEn > MAXIMA_ANTIGUEDAD_BORRADOR_MS
        ) {
          window.localStorage.removeItem(clave);
        }
      } catch {
        window.localStorage.removeItem(clave);
      }
    });
  } catch {
    // El cierre de sesión no debe fallar si el navegador niega este acceso.
  }
}
