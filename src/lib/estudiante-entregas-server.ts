import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { mensajeError } from "@/lib/mensaje-error";
import {
  MAX_INTENTOS_AUTO,
  quitarMetaEntregaAuto,
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
};

type ActividadParaAcceso = {
  id: string;
  unidadId: string;
  requiereActividadId: string | null;
  unidadOrden: number;
};

type ClienteAdmin = ReturnType<typeof createAdminClient>;

export async function validarAccesoActividad(
  supabase: SupabaseServerClient,
  admin: ClienteAdmin,
  estudianteId: string,
  actividad: ActividadParaAcceso,
): Promise<{ ok: true } | { ok: false; error: string; motivo: MotivoBloqueoActividad }> {
  if (actividad.requiereActividadId) {
    const [{ data: entregaPrerequisito, error: entregaPrerequisitoError }, { data: reflexionPrerequisito, error: reflexionPrerequisitoError }] = await Promise.all([
      supabase
        .from("entregas")
        .select("puntaje_auto, respuesta")
        .eq("actividad_id", actividad.requiereActividadId)
        .eq("estudiante_id", estudianteId)
        .maybeSingle(),
      supabase
        .from("reflexiones")
        .select("id")
        .eq("actividad_id", actividad.requiereActividadId)
        .eq("estudiante_id", estudianteId)
        .eq("momento", "cierre")
        .maybeSingle(),
    ]);
    revisarErrorConsulta(entregaPrerequisitoError, "No pudimos comprobar la actividad anterior.");
    revisarErrorConsulta(reflexionPrerequisitoError, "No pudimos comprobar la reflexión de la actividad anterior.");

    if (!entregaPrerequisito || !entregaCuentaComoCompletada(entregaPrerequisito)) {
      return {
        ok: false,
        error: "Completa la actividad anterior antes de continuar.",
        motivo: "dependencia",
      };
    }
    if (!reflexionPrerequisito) {
      return {
        ok: false,
        error: "Guarda la reflexión de la actividad anterior antes de continuar.",
        motivo: "dependencia_reflexion",
      };
    }
  }

  if (actividad.unidadOrden <= 1) return { ok: true };

  const { data: unidadAnterior, error: unidadAnteriorError } = await admin
    .from("unidades")
    .select("id, nombre, orden, actividades(id, orden)")
    .eq("orden", actividad.unidadOrden - 1)
    .maybeSingle();
  revisarErrorConsulta(unidadAnteriorError, "No pudimos comprobar la unidad anterior.");

  if (!unidadAnterior) return { ok: true };

  const actividadesAnteriores = Array.isArray(unidadAnterior.actividades)
    ? unidadAnterior.actividades
    : [];
  const idsAnteriores = actividadesAnteriores.map((item: { id: string }) => item.id);
  const { data: entregasAnteriores, error: entregasAnterioresError } = idsAnteriores.length
    ? await supabase
        .from("entregas")
      .select("actividad_id, puntaje_auto, respuesta")
        .eq("estudiante_id", estudianteId)
        .in("actividad_id", idsAnteriores)
    : { data: [] as { actividad_id: string; puntaje_auto: number | null; respuesta: unknown }[], error: null };
  revisarErrorConsulta(entregasAnterioresError, "No pudimos comprobar tus actividades anteriores.");

  const ultimaActividadAnterior = actividadesAnteriores
    .slice()
    .sort((a: { orden: number }, b: { orden: number }) => b.orden - a.orden)[0];
  const [
    { data: reflexionUnidad, error: reflexionUnidadError },
    { data: reflexionUltimaActividad, error: reflexionUltimaActividadError },
  ] = await Promise.all([
    supabase
      .from("reflexiones")
      .select("id")
      .eq("estudiante_id", estudianteId)
      .eq("unidad_id", unidadAnterior.id)
      .eq("momento", "cierre")
      .maybeSingle(),
    ultimaActividadAnterior
      ? supabase
          .from("reflexiones")
          .select("id")
          .eq("estudiante_id", estudianteId)
          .eq("actividad_id", ultimaActividadAnterior.id)
          .eq("momento", "cierre")
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  revisarErrorConsulta(reflexionUnidadError, "No pudimos comprobar el cierre de la unidad anterior.");
  revisarErrorConsulta(reflexionUltimaActividadError, "No pudimos comprobar la reflexión de la última actividad.");

  const actividadesAnterioresCompletadas = new Set(
    (entregasAnteriores ?? [])
      .filter((entrega) => entregaCuentaComoCompletada(entrega))
      .map((entrega) => entrega.actividad_id),
  ).size;

  if (!unidadEstaCompleta(idsAnteriores.length, actividadesAnterioresCompletadas)) {
    return {
      ok: false,
      error: `Termina primero la Unidad ${unidadAnterior.orden}: completa todas sus actividades.`,
      motivo: "unidad_anterior_actividades",
    };
  }

  if (!reflexionUltimaActividad && !reflexionUnidad) {
    return {
      ok: false,
      error: `Termina primero la Unidad ${unidadAnterior.orden}: guarda sus dos reflexiones pendientes.`,
      motivo: "unidad_anterior_reflexiones",
    };
  }

  if (!reflexionUltimaActividad) {
    return {
      ok: false,
      error: `Termina primero la Unidad ${unidadAnterior.orden}: guarda la reflexión de su última actividad.`,
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

  return { ok: true };
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

  const { data: estudiante } = await supabase
    .from("estudiantes")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();
  if (!estudiante) return { ok: false, error: SESION_INVALIDA };

  const { data: actividad } = await createAdminClient()
    .from("actividades")
    .select("id, unidad_id, requiere_actividad_id, contenido, tipos_actividad(nombre), unidades(orden)")
    .eq("id", actividadId)
    .single();
  if (!actividad) return { ok: false, error: "No encontramos esta actividad." };

  const tipo = Array.isArray(actividad.tipos_actividad) ? actividad.tipos_actividad[0] : actividad.tipos_actividad;
  if (tipo?.nombre !== tipoEsperado || !esRegistroPlano(actividad.contenido)) {
    return { ok: false, error: "Esta actividad ya no coincide con el contenido mostrado. Recarga la página." };
  }

  const unidad = Array.isArray(actividad.unidades) ? actividad.unidades[0] : actividad.unidades;
  const acceso = await validarAccesoActividad(supabase, createAdminClient(), estudiante.id, {
    id: actividad.id,
    unidadId: actividad.unidad_id,
    requiereActividadId: actividad.requiere_actividad_id,
    unidadOrden: Number(unidad?.orden ?? 1),
  });
  if (!acceso.ok) return acceso;

  return {
    ok: true,
    contexto: { supabase, estudianteId: estudiante.id, contenido: actividad.contenido },
  };
}

async function estudianteDeSesion(supabase: SupabaseServerClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: estudiante } = await supabase
    .from("estudiantes")
    .select("id")
    .eq("auth_user_id", user.id)
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
  const esAutocalificable = puntajeAuto !== null;
  const respuestaLimpia = esAutocalificable ? quitarMetaEntregaAuto(respuesta) : respuesta;
  let respuestaParaGuardar = respuestaLimpia;
  let respuestaParaCliente = respuestaLimpia;
  let puntajeParaGuardar = puntajeAuto;
  let intentos: number | undefined;
  let mejorPuntaje: number | null = puntajeAuto;

  if (esAutocalificable) {
    const { data: resultadoAuto, error: resultadoAutoError } = await admin.rpc("guardar_entrega_auto", {
      p_estudiante_id: estudianteId,
      p_actividad_id: actividadId,
      p_respuesta: respuestaLimpia,
      p_puntaje_auto: puntajeAuto,
      p_estado: estado,
    });
    if (resultadoAutoError) {
      const mensaje = resultadoAutoError.message?.includes("Ya usaste los 3 intentos")
        ? `Ya usaste los ${MAX_INTENTOS_AUTO} intentos de esta actividad.`
        : mensajeError(resultadoAutoError);
      return { ok: false, error: mensaje };
    }

    const filaAuto = Array.isArray(resultadoAuto) ? resultadoAuto[0] : resultadoAuto;
    if (!filaAuto || typeof filaAuto !== "object") {
      return { ok: false, error: "No pudimos guardar tu intento. Intenta de nuevo." };
    }

    intentos = Number(filaAuto.intentos);
    mejorPuntaje = Number(filaAuto.mejor_puntaje);
    puntajeParaGuardar = Number(filaAuto.puntaje_guardado);
    respuestaParaCliente = filaAuto.respuesta_cliente as Record<string, unknown>;
    respuestaParaGuardar = filaAuto.respuesta_guardada as Record<string, unknown>;

    return { ok: true, puntajeAuto: puntajeParaGuardar, respuesta: respuestaParaCliente, intentos, mejorPuntaje };
  }

  const { error } = await admin.from("entregas").upsert(
    {
      estudiante_id: estudianteId,
      actividad_id: actividadId,
      respuesta: respuestaParaGuardar,
      estado,
      puntaje_auto: puntajeParaGuardar,
    },
    { onConflict: "estudiante_id,actividad_id" },
  );
  if (error) return { ok: false, error: mensajeError(error) };

  return { ok: true, puntajeAuto: puntajeParaGuardar, respuesta: respuestaParaCliente, intentos, mejorPuntaje };
}
