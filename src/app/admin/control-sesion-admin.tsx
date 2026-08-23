"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const TIEMPO_INACTIVIDAD_MS = 30 * 60 * 1000;

export default function ControlSesionAdmin() {
  useEffect(() => {
    let temporizador: number | undefined;
    let ultimoMovimiento = Date.now();
    let cerrando = false;

    const cerrarPorInactividad = async () => {
      if (cerrando) return;
      cerrando = true;
      // El panel es un perfil de alto impacto: un cierre por inactividad
      // también revoca las demás sesiones del mismo administrador.
      await createClient().auth.signOut({ scope: "global" });
      window.location.replace("/ingreso/profesora?sesion=expirada");
    };

    const programarRevision = () => {
      if (temporizador !== undefined) window.clearTimeout(temporizador);
      const restante = Math.max(1000, TIEMPO_INACTIVIDAD_MS - (Date.now() - ultimoMovimiento));
      temporizador = window.setTimeout(() => {
        if (Date.now() - ultimoMovimiento >= TIEMPO_INACTIVIDAD_MS) {
          void cerrarPorInactividad();
        } else {
          programarRevision();
        }
      }, restante);
    };

    const registrarActividad = () => {
      ultimoMovimiento = Date.now();
      programarRevision();
    };

    ["pointerdown", "keydown", "touchstart"].forEach((evento) => {
      window.addEventListener(evento, registrarActividad, { passive: true });
    });
    programarRevision();

    return () => {
      if (temporizador !== undefined) window.clearTimeout(temporizador);
      ["pointerdown", "keydown", "touchstart"].forEach((evento) => {
        window.removeEventListener(evento, registrarActividad);
      });
    };
  }, []);

  return null;
}
