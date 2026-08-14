import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { mensajeError } from "@/lib/mensaje-error";
import {
  MAX_INTENTOS_AUTO,
  agregarMetaEntregaAuto,
  metaDeEntregaAuto,
  quitarMetaEntregaAuto,
} from "@/lib/intentos-auto";
import {
  esRegistroPlano,
  esUuid,
  validarEstadoEntrega,
  validarJsonDeEntrega,
  validarPuntaje,
} from "@/lib/validar-entrega";

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
  contenido: Record<string, unknown>;
};

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

  const { data: estudiante } = await supabase
    .from("estudiantes")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();
  if (!estudiante) return { ok: false, error: SESION_INVALIDA };

  const { data: actividad } = await createAdminClient()
    .from("actividades")
    .select("id, contenido, tipos_actividad(nombre)")
    .eq("id", actividadId)
    .single();
  if (!actividad) return { ok: false, error: "No encontramos esta actividad." };

  const tipo = Array.isArray(actividad.tipos_actividad) ? actividad.tipos_actividad[0] : actividad.tipos_actividad;
  if (tipo?.nombre !== tipoEsperado || !esRegistroPlano(actividad.contenido)) {
    return { ok: false, error: "Esta actividad ya no coincide con el contenido mostrado. Recarga la página." };
  }

  return {
    ok: true,
    contexto: { supabase, contenido: actividad.contenido },
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
): Promise<ResultadoCalificacion> {
  if (!esUuid(actividadId)) return { ok: false, error: "La actividad no es válida." };
  const errorRespuesta = validarJsonDeEntrega(respuesta);
  if (errorRespuesta) return { ok: false, error: errorRespuesta };
  if (!validarPuntaje(puntajeAuto) || !validarEstadoEntrega(estado)) {
    return { ok: false, error: "Los datos de la entrega no son válidos." };
  }

  const estudianteId = await estudianteDeSesion(supabase);
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
    const { data: entregaAnterior, error: entregaAnteriorError } = await admin
      .from("entregas")
      .select("respuesta, puntaje_auto")
      .eq("estudiante_id", estudianteId)
      .eq("actividad_id", actividadId)
      .maybeSingle();
    if (entregaAnteriorError) return { ok: false, error: mensajeError(entregaAnteriorError) };

    const intentosAnteriores = entregaAnterior
      ? metaDeEntregaAuto(entregaAnterior.respuesta)?.intentos ?? 1
      : 0;
    if (intentosAnteriores >= MAX_INTENTOS_AUTO) {
      return { ok: false, error: `Ya usaste los ${MAX_INTENTOS_AUTO} intentos de esta actividad.` };
    }

    intentos = intentosAnteriores + 1;
    mejorPuntaje = Math.max(entregaAnterior?.puntaje_auto ?? 0, puntajeAuto);
    const meta = { intentos, mejorPuntaje };
    respuestaParaCliente = agregarMetaEntregaAuto(respuestaLimpia, meta);

    // Conserva la respuesta asociada al mejor resultado. La respuesta del
    // intento actual se devuelve aparte para que el estudiante vea su
    // retroalimentación inmediatamente, aunque no haya superado su marca.
    respuestaParaGuardar =
      entregaAnterior && (entregaAnterior.puntaje_auto ?? -1) > puntajeAuto &&
      entregaAnterior.respuesta && typeof entregaAnterior.respuesta === "object"
        ? agregarMetaEntregaAuto(entregaAnterior.respuesta as Record<string, unknown>, meta)
        : respuestaParaCliente;
    puntajeParaGuardar = mejorPuntaje;
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

  try {
    await supabase.rpc("verificar_insignias");
  } catch {
    // La entrega ya quedó guardada; una insignia puede calcularse en la siguiente visita.
  }

  return { ok: true, puntajeAuto: puntajeParaGuardar, respuesta: respuestaParaCliente, intentos, mejorPuntaje };
}

export async function reiniciarEntregaInterna(
  supabase: SupabaseServerClient,
  actividadId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!esUuid(actividadId)) return { ok: false, error: "La actividad no es válida." };
  const estudianteId = await estudianteDeSesion(supabase);
  if (!estudianteId) return { ok: false, error: SESION_INVALIDA };

  const { error } = await createAdminClient()
    .from("entregas")
    .delete()
    .eq("estudiante_id", estudianteId)
    .eq("actividad_id", actividadId);
  if (error) return { ok: false, error: mensajeError(error) };
  return { ok: true };
}
