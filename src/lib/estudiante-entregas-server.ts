import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { mensajeError } from "@/lib/mensaje-error";
import {
  quitarMetaEntregaAuto,
  requiereReintentoAlternativo,
} from "@/lib/intentos-auto";
import {
  esRegistroPlano,
  esUuid,
  validarEstadoEntrega,
  validarJsonDeEntrega,
  validarPuntaje,
} from "@/lib/validar-entrega";
import {
  type MotivoBloqueoActividad,
  entregaCuentaComoCompletada,
  unidadEstaCompleta,
} from "@/lib/progreso-unidad";
import { revisarErrorConsulta } from "@/lib/revisar-error-consulta";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ResultadoCalificacion =
  | {
      ok: true;
      puntajeAuto: number | null;
      respuesta: Record<string, unknown>;
      intentos?: number;
      mejorPuntaje?: number | null;
    }
  | { ok: false; error: string };

export type ContextoCalificacion = {
  supabase: SupabaseServerClient;
  estudianteId: string;
  contenido: Record<string, unknown>;
  respuestaPrevia: Record<string, unknown> | null;
};

type ActividadParaAcceso = {
  id: string;
  unidadId: string;
  orden: number;
  requiereActividadId: string | null;
  unidadOrden: number;
};

type ClienteAdmin = ReturnType<typeof createAdminClient>;

export function sanitizarRespuestaParaEstudiante(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(sanitizarRespuestaParaEstudiante);
  if (!valor || typeof valor !== "object") return valor;
  const resultado: Record<string, unknown> = {};
  for (const [clave, contenido] of Object.entries(valor as Record<string, unknown>)) {
    if (["respuesta_correcta", "opcionCorrecta", "texto_correcto", "itemsSnapshot"].includes(clave)) continue;
    if (clave === "correcta" && typeof contenido === "string") continue;
    resultado[clave] = sanitizarRespuestaParaEstudiante(contenido);
  }
  return resultado;
}

export async function validarAccesoActividad(
  admin: ClienteAdmin,
  estudianteId: string,
  actividad: ActividadParaAcceso,
  opciones: { requiereInicio?: boolean } = {},
): Promise<{ ok: true } | { ok: false; error: string; motivo: MotivoBloqueoActividad }> {
  // Todas las lecturas de avance se filtran por el estudiante previamente
  // resuelto desde auth.uid(). Se usa el cliente de servidor para no depender
  // de permisos directos de una sesión anónima sobre tablas de aprendizaje.
  const lectura = admin;
  const [{ data: bitacoraInicio, error: bitacoraError }, { data: confianzaInicio, error: confianzaError }] = await Promise.all([
    lectura
      .from("bitacora")
      .select("id")
      .eq("estudiante_id", estudianteId)
      .eq("unidad_id", actividad.unidadId)
      .maybeSingle(),
    lectura
      .from("autoevaluaciones_confianza")
      .select("id")
      .eq("estudiante_id", estudianteId)
      .eq("unidad_id", actividad.unidadId)
      .eq("momento", "inicio")
      .maybeSingle(),
  ]);
  revisarErrorConsulta(bitacoraError, "No pudimos comprobar tu meta de unidad.");
  revisarErrorConsulta(confianzaError, "No pudimos comprobar tu confianza inicial.");
  if (opciones.requiereInicio !== false && (!bitacoraInicio || !confianzaInicio)) {
    return {
      ok: false,
      error: "Define tu meta y registra tu confianza inicial antes de comenzar esta unidad.",
      motivo: "unidad_inicio",
    };
  }

  // El recorrido es secuencial aunque el catálogo no declare una dependencia
  // explícita: para abrir cualquier actividad posterior deben estar guardadas
  // tanto la entrega como la reflexión de todas las actividades anteriores.
  // Una dependencia curricular distinta se comprueba además, sin confundirla
  // con el orden ni con los intentos de una misma actividad.
  const { data: actividadesAnterioresUnidad, error: actividadesAnterioresUnidadError } = await lectura
    .from("actividades")
    .select("id, titulo, contenido")
    .eq("unidad_id", actividad.unidadId)
    .lt("orden", actividad.orden)
    .order("orden");
  revisarErrorConsulta(actividadesAnterioresUnidadError, "No pudimos comprobar las actividades anteriores.");

  const idsPrerequisito = Array.from(
    new Set(
      [...(actividadesAnterioresUnidad ?? []).map((anterior) => anterior.id), actividad.requiereActividadId].filter(
        (id): id is string => typeof id === "string",
      ),
    ),
  );
  if (idsPrerequisito.length) {
    const [
      { data: entregasPrerequisito, error: entregasPrerequisitoError },
      { data: reflexionesPrerequisito, error: reflexionesPrerequisitoError },
    ] = await Promise.all([
      lectura
        .from("entregas")
        .select("actividad_id, puntaje_auto, respuesta")
        .eq("estudiante_id", estudianteId)
        .in("actividad_id", idsPrerequisito),
      lectura
        .from("reflexiones")
        .select("actividad_id")
        .eq("estudiante_id", estudianteId)
        .eq("momento", "cierre")
        .in("actividad_id", idsPrerequisito),
    ]);
    revisarErrorConsulta(entregasPrerequisitoError, "No pudimos comprobar las actividades anteriores.");
    revisarErrorConsulta(reflexionesPrerequisitoError, "No pudimos comprobar las reflexiones anteriores.");

    const idsEntregados = new Set(
      (entregasPrerequisito ?? [])
        .filter((entrega) => {
          const actividadPrerequisito = (actividadesAnterioresUnidad ?? []).find(
            (anterior) => anterior.id === entrega.actividad_id,
          );
          return entregaCuentaComoCompletada(entrega, actividadPrerequisito?.contenido);
        })
        .map((entrega) => entrega.actividad_id),
    );
    const entregaQueRequiereReintento = (entregasPrerequisito ?? []).find((entrega) => {
      const actividadPrerequisito = (actividadesAnterioresUnidad ?? []).find(
        (anterior) => anterior.id === entrega.actividad_id,
      );
      return requiereReintentoAlternativo(
        actividadPrerequisito?.contenido,
        entrega.respuesta,
        entrega.puntaje_auto,
      );
    });
    if (entregaQueRequiereReintento) {
      return {
        ok: false,
        error: "Mejora el resultado de la actividad anterior con su ejercicio alternativo antes de continuar.",
        motivo: "dependencia_reintento",
      };
    }

    if (idsPrerequisito.some((id) => !idsEntregados.has(id))) {
      return {
        ok: false,
        error: "Completa las actividades anteriores antes de continuar.",
        motivo: "dependencia",
      };
    }

    const idsReflexionados = new Set((reflexionesPrerequisito ?? []).map((reflexion) => reflexion.actividad_id));
    if (idsPrerequisito.some((id) => !idsReflexionados.has(id))) {
      return {
        ok: false,
        error: "Guarda las reflexiones de las actividades anteriores antes de continuar.",
        motivo: "dependencia_reflexion",
      };
    }
  }

  if (actividad.unidadOrden <= 1) return { ok: true };

  const { data: unidadAnterior, error: unidadAnteriorError } = await admin
    .from("unidades")
    .select("id, nombre, orden, actividades(id, orden, contenido)")
    .eq("orden", actividad.unidadOrden - 1)
    .maybeSingle();
  revisarErrorConsulta(unidadAnteriorError, "No pudimos comprobar la unidad anterior.");

  if (!unidadAnterior) return { ok: true };

  const actividadesAnteriores = Array.isArray(unidadAnterior.actividades)
    ? unidadAnterior.actividades
    : [];
  const idsAnteriores = actividadesAnteriores.map((item: { id: string }) => item.id);
  const { data: entregasAnteriores, error: entregasAnterioresError } = idsAnteriores.length
    ? await lectura
        .from("entregas")
      .select("actividad_id, puntaje_auto, respuesta")
        .eq("estudiante_id", estudianteId)
        .in("actividad_id", idsAnteriores)
    : { data: [] as { actividad_id: string; puntaje_auto: number | null; respuesta: unknown }[], error: null };
  revisarErrorConsulta(entregasAnterioresError, "No pudimos comprobar tus actividades anteriores.");

  const [
    { data: reflexionesActividadesAnteriores, error: reflexionesActividadesAnterioresError },
    { data: reflexionUnidad, error: reflexionUnidadError },
    { data: confianzaCierre, error: confianzaCierreError },
  ] = await Promise.all([
    idsAnteriores.length
      ? lectura
          .from("reflexiones")
          .select("actividad_id")
          .eq("estudiante_id", estudianteId)
          .eq("momento", "cierre")
          .in("actividad_id", idsAnteriores)
      : Promise.resolve({ data: [] as { actividad_id: string | null }[], error: null }),
    lectura
      .from("reflexiones")
      .select("id")
      .eq("estudiante_id", estudianteId)
      .eq("unidad_id", unidadAnterior.id)
      .eq("momento", "cierre")
      .maybeSingle(),
    lectura
      .from("autoevaluaciones_confianza")
      .select("id")
      .eq("estudiante_id", estudianteId)
      .eq("unidad_id", unidadAnterior.id)
      .eq("momento", "cierre")
      .maybeSingle(),
  ]);
  revisarErrorConsulta(
    reflexionesActividadesAnterioresError,
    "No pudimos comprobar las reflexiones de la unidad anterior.",
  );
  revisarErrorConsulta(reflexionUnidadError, "No pudimos comprobar el cierre de la unidad anterior.");
  revisarErrorConsulta(confianzaCierreError, "No pudimos comprobar la confianza final de la unidad anterior.");

  const actividadesAnterioresCompletadas = new Set(
    (entregasAnteriores ?? [])
      .filter((entrega) => {
        const actividadAnterior = actividadesAnteriores.find(
          (anterior: { id: string }) => anterior.id === entrega.actividad_id,
        );
        return entregaCuentaComoCompletada(entrega, actividadAnterior?.contenido);
      })
      .map((entrega) => entrega.actividad_id),
  ).size;

  const entregaQueRequiereReintentoAnterior = (entregasAnteriores ?? []).find((entrega) => {
    const actividadAnterior = actividadesAnteriores.find(
      (anterior: { id: string }) => anterior.id === entrega.actividad_id,
    );
    return requiereReintentoAlternativo(
      actividadAnterior?.contenido,
      entrega.respuesta,
      entrega.puntaje_auto,
    );
  });
  if (entregaQueRequiereReintentoAnterior) {
    return {
      ok: false,
      error: `Termina primero la Unidad ${unidadAnterior.orden}: mejora la actividad pendiente con su ejercicio alternativo.`,
      motivo: "unidad_anterior_reintento",
    };
  }

  if (!unidadEstaCompleta(idsAnteriores.length, actividadesAnterioresCompletadas)) {
    return {
      ok: false,
      error: `Termina primero la Unidad ${unidadAnterior.orden}: completa todas sus actividades.`,
      motivo: "unidad_anterior_actividades",
    };
  }

  const actividadesAnterioresReflexionadas = new Set(
    (reflexionesActividadesAnteriores ?? [])
      .map((reflexion) => reflexion.actividad_id)
      .filter((id): id is string => typeof id === "string"),
  ).size;
  if (!unidadEstaCompleta(idsAnteriores.length, actividadesAnterioresReflexionadas)) {
    return {
      ok: false,
      error: `Termina primero la Unidad ${unidadAnterior.orden}: guarda la reflexión de cada actividad.`,
      motivo: "unidad_anterior_reflexion_actividad",
    };
  }

  if (!reflexionUnidad) {
    return {
      ok: false,
      error: `Termina primero la Unidad ${unidadAnterior.orden}: escribe su reflexión de cierre.`,
      motivo: "unidad_anterior_reflexion_unidad",
    };
  }

  if (!confianzaCierre) {
    return {
      ok: false,
      error: `Termina primero la Unidad ${unidadAnterior.orden}: registra tu confianza final.`,
      motivo: "unidad_anterior_confianza",
    };
  }

  return { ok: true };
}

/** Valida la unidad anterior y devuelve el primer paso de la unidad actual. */
export async function validarAccesoUnidad(
  admin: ClienteAdmin,
  estudianteId: string,
  unidadId: string,
  requiereInicio = true,
) {
  const { data: actividad, error } = await admin
    .from("actividades")
    .select("id, unidad_id, orden, requiere_actividad_id, unidades(orden)")
    .eq("unidad_id", unidadId)
    .order("orden")
    .limit(1)
    .maybeSingle();
  revisarErrorConsulta(error, "No pudimos comprobar el inicio de la unidad.");
  if (!actividad) return { ok: true as const };
  const unidad = Array.isArray(actividad.unidades) ? actividad.unidades[0] : actividad.unidades;
  return validarAccesoActividad(
    admin,
    estudianteId,
    {
      id: actividad.id,
      unidadId: actividad.unidad_id,
      orden: actividad.orden,
      requiereActividadId: actividad.requiere_actividad_id,
      unidadOrden: Number(unidad?.orden ?? 1),
    },
    { requiereInicio },
  );
}

const SESION_INVALIDA = "Tu sesión ya no es válida. Entra de nuevo para continuar.";

export async function obtenerContextoCalificacion(
  actividadId: string,
  tipoEsperado: string,
): Promise<{ ok: true; contexto: ContextoCalificacion } | { ok: false; error: string }> {
  if (!esUuid(actividadId) || typeof tipoEsperado !== "string" || tipoEsperado.length > 80) {
    return { ok: false, error: "La actividad no es válida." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: SESION_INVALIDA };
  if (user.is_anonymous !== true) return { ok: false, error: SESION_INVALIDA };

  const admin = createAdminClient();
  const { data: estudiante } = await admin
    .from("estudiantes")
    .select("id, debe_cambiar_nip")
    .eq("auth_user_id", user.id)
    .eq("activo", true)
    .single();
  if (!estudiante) return { ok: false, error: SESION_INVALIDA };
  if (estudiante.debe_cambiar_nip) return { ok: false, error: "Debes cambiar tu NIP antes de continuar." };

  const { data: actividad } = await admin
    .from("actividades")
    .select("id, unidad_id, orden, requiere_actividad_id, contenido, tipos_actividad(nombre), unidades(orden)")
    .eq("id", actividadId)
    .single();
  if (!actividad) return { ok: false, error: "No encontramos esta actividad." };

  const tipo = Array.isArray(actividad.tipos_actividad) ? actividad.tipos_actividad[0] : actividad.tipos_actividad;
  if (tipo?.nombre !== tipoEsperado || !esRegistroPlano(actividad.contenido)) {
    return { ok: false, error: "Esta actividad ya no coincide con el contenido mostrado. Recarga la página." };
  }

  const unidad = Array.isArray(actividad.unidades) ? actividad.unidades[0] : actividad.unidades;
  const acceso = await validarAccesoActividad(admin, estudiante.id, {
    id: actividad.id,
    unidadId: actividad.unidad_id,
    orden: actividad.orden,
    requiereActividadId: actividad.requiere_actividad_id,
    unidadOrden: Number(unidad?.orden ?? 1),
  });
  if (!acceso.ok) return acceso;

  const { data: entregaPrevia, error: entregaPreviaError } = await admin
    .from("entregas")
    .select("respuesta")
    .eq("actividad_id", actividadId)
    .eq("estudiante_id", estudiante.id)
    .maybeSingle();
  revisarErrorConsulta(entregaPreviaError, "No pudimos comprobar tu intento anterior.");

  return {
    ok: true,
    contexto: {
      supabase,
      estudianteId: estudiante.id,
      contenido: actividad.contenido,
      respuestaPrevia: esRegistroPlano(entregaPrevia?.respuesta) ? entregaPrevia.respuesta : null,
    },
  };
}

async function estudianteDeSesion(supabase: SupabaseServerClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: estudiante } = await createAdminClient()
    .from("estudiantes")
    .select("id")
    .eq("auth_user_id", user.id)
    .eq("activo", true)
    .single();
  return estudiante?.id ?? null;
}

/**
 * Único punto interno que escribe entregas.
 * Este módulo es server-only y no contiene `use server`: no se publica como
 * Server Action. Además, resuelve el estudiante desde la sesión real en vez
 * de confiar en un id recibido del navegador.
 */
export async function guardarEntregaInterna(
  supabase: SupabaseServerClient,
  actividadId: string,
  respuesta: Record<string, unknown>,
  puntajeAuto: number | null,
  estado: "completada" | "pendiente_revision" = "completada",
  estudianteIdValidado?: string,
): Promise<ResultadoCalificacion> {
  if (!esUuid(actividadId)) return { ok: false, error: "La actividad no es válida." };
  const errorRespuesta = validarJsonDeEntrega(respuesta);
  if (errorRespuesta) return { ok: false, error: errorRespuesta };
  if (!validarPuntaje(puntajeAuto) || !validarEstadoEntrega(estado)) {
    return { ok: false, error: "Los datos de la entrega no son válidos." };
  }

  const estudianteId = estudianteIdValidado ?? (await estudianteDeSesion(supabase));
  if (!estudianteId) return { ok: false, error: SESION_INVALIDA };

  const admin = createAdminClient();
  const respuestaLimpia = quitarMetaEntregaAuto(respuesta);
  const { data: resultado, error: resultadoError } = await admin.rpc("guardar_entrega_auto", {
    p_estudiante_id: estudianteId,
    p_actividad_id: actividadId,
    p_respuesta: respuestaLimpia,
    p_puntaje_auto: puntajeAuto,
    p_estado: estado,
  });
  if (resultadoError) {
    const mensaje = resultadoError.message?.includes("Ya usaste los 2 intentos")
      ? "Ya usaste los 2 intentos de esta actividad. Se conserva tu respuesta y puedes continuar con la reflexión."
      : resultadoError.message?.includes("Ya registraste el único intento")
        ? "Ya registraste el único intento de esta actividad. Se conserva tu respuesta y puedes continuar con la reflexión."
        : mensajeError(resultadoError);
    return { ok: false, error: mensaje };
  }

  const fila = Array.isArray(resultado) ? resultado[0] : resultado;
  if (!fila || typeof fila !== "object") {
    return { ok: false, error: "No pudimos guardar tu intento. Intenta de nuevo." };
  }

  const puntajeGuardado = fila.puntaje_guardado == null ? null : Number(fila.puntaje_guardado);
  const intentos = Number(fila.intentos);
  const mejorPuntaje = fila.mejor_puntaje == null ? null : Number(fila.mejor_puntaje);
  if (!Number.isInteger(intentos) || intentos < 1 || intentos > 2) {
    return { ok: false, error: "No pudimos confirmar el número de intentos. Intenta de nuevo." };
  }
  return {
    ok: true,
    puntajeAuto: puntajeGuardado,
    respuesta: sanitizarRespuestaParaEstudiante(fila.respuesta_cliente) as Record<string, unknown>,
    intentos,
    mejorPuntaje,
  };
}
