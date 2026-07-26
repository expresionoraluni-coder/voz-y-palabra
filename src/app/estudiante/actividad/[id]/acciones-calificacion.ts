"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mensajeError } from "@/lib/mensaje-error";
import { calificarVideos, type ContenidoEvaluarVideos } from "@/lib/calificacion-evaluar-videos";
import { calificarOrden, type ContenidoOrdenarFragmentos } from "@/lib/calificacion-ordenar-fragmentos";
import { calificarComparadorChips, type ContenidoComparador } from "@/lib/calificacion-comparador";
import { calificarClasificacion, type ContenidoClasificacion } from "@/lib/calificacion-clasificacion";
import { calificarEtiquetado, type ContenidoEtiquetadoTexto } from "@/lib/calificacion-etiquetado-texto";
import {
  calificarRondas,
  rondasDeContenido,
  type ContenidoOpcionJustificacion,
  type RondaRespuesta,
} from "@/lib/opcion-justificacion";
import { calificarOrtografia, type ContenidoOrtografia } from "@/lib/comparar-ortografia";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ResultadoCalificacion =
  | { ok: true; puntajeAuto: number | null; respuesta: Record<string, unknown> }
  | { ok: false; error: string };

const SESION_INVALIDA = "Tu sesión ya no es válida, entra de nuevo.";

// Toda Server Action es un endpoint alcanzable directo, sin pasar por la UI
// (documentado así por Next) — nunca se confía en un estudianteId/contenido
// que mande el cliente: aquí siempre se resuelve la sesión real y se trae
// el contenido (incluida la clave de calificación) fresco de la base.
export async function contextoCalificacion(
  actividadId: string,
  tipoEsperado: string,
): Promise<
  | { ok: true; supabase: SupabaseServerClient; estudianteId: string; contenido: Record<string, unknown> }
  | { ok: false; error: string }
> {
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

  const { data: actividad } = await supabase
    .from("actividades")
    .select("id, contenido, tipos_actividad(nombre)")
    .eq("id", actividadId)
    .single();
  if (!actividad) return { ok: false, error: "No encontramos esta actividad." };

  const tipo = Array.isArray(actividad.tipos_actividad) ? actividad.tipos_actividad[0] : actividad.tipos_actividad;
  if (tipo?.nombre !== tipoEsperado) {
    return { ok: false, error: "Esta actividad ya no es de este tipo, recarga la página." };
  }

  return {
    ok: true,
    supabase,
    estudianteId: estudiante.id,
    contenido: actividad.contenido as Record<string, unknown>,
  };
}

// El upsert va con el cliente admin (service role), no con el de sesión del
// estudiante: RLS de `entregas` ya no le da al estudiante ningún permiso de
// escritura directa (ver sub-fase 5 del hardening de seguridad) — la única
// vía de escritura es esta función, después de que la Server Action que la
// llama ya validó/recalculó todo del lado del servidor. `verificar_insignias`
// sigue yendo por el cliente de SESIÓN (con `await`, a diferencia del
// fire-and-forget de useEntregaActividad.ts: dentro de una función
// serverless de Netlify no hay garantía de que una promesa sin esperar
// termine antes de que el runtime corte la ejecución al devolver la
// respuesta) — es SECURITY DEFINER pero igual necesita auth.uid() real para
// resolver estudiante_actual(), que el cliente admin no tiene.
export async function guardarEntregaCalificada(
  supabase: SupabaseServerClient,
  estudianteId: string,
  actividadId: string,
  respuesta: Record<string, unknown>,
  puntajeAuto: number | null,
  estado: "completada" | "pendiente_revision" = "completada",
): Promise<ResultadoCalificacion> {
  const admin = createAdminClient();
  const { error } = await admin.from("entregas").upsert(
    {
      estudiante_id: estudianteId,
      actividad_id: actividadId,
      respuesta,
      estado,
      puntaje_auto: puntajeAuto,
    },
    { onConflict: "estudiante_id,actividad_id" },
  );
  if (error) return { ok: false, error: mensajeError(error) };

  try {
    await supabase.rpc("verificar_insignias");
  } catch {
    // silencioso a propósito, igual que en useEntregaActividad.ts
  }

  return { ok: true, puntajeAuto, respuesta };
}

export async function calificarEvaluarVideos(
  actividadId: string,
  marcadasBien: string[],
  marcadasMal: string[],
): Promise<ResultadoCalificacion> {
  const ctx = await contextoCalificacion(actividadId, "evaluar_videos");
  if (!ctx.ok) return ctx;

  const { puntajeAuto, resultado } = calificarVideos(
    ctx.contenido as unknown as ContenidoEvaluarVideos,
    marcadasBien,
    marcadasMal,
  );

  return guardarEntregaCalificada(
    ctx.supabase,
    ctx.estudianteId,
    actividadId,
    { marcadas_bien: marcadasBien, marcadas_mal: marcadasMal, resultado },
    puntajeAuto,
  );
}

export async function calificarOrdenarFragmentos(actividadId: string, secuencia: number[]): Promise<ResultadoCalificacion> {
  const ctx = await contextoCalificacion(actividadId, "ordenar_fragmentos");
  if (!ctx.ok) return ctx;

  const { puntajeAuto, resultadoPorPosicion } = calificarOrden(
    ctx.contenido as unknown as ContenidoOrdenarFragmentos,
    secuencia,
  );

  return guardarEntregaCalificada(
    ctx.supabase,
    ctx.estudianteId,
    actividadId,
    { orden: secuencia, resultadoPorPosicion },
    puntajeAuto,
  );
}

export async function calificarComparadorChipsAccion(actividadId: string, celdas: string[][]): Promise<ResultadoCalificacion> {
  const ctx = await contextoCalificacion(actividadId, "comparador");
  if (!ctx.ok) return ctx;

  const { puntajeAuto, resultadoCeldas } = calificarComparadorChips(
    ctx.contenido as unknown as ContenidoComparador,
    celdas,
  );

  return guardarEntregaCalificada(
    ctx.supabase,
    ctx.estudianteId,
    actividadId,
    { celdas, resultadoCeldas },
    puntajeAuto,
  );
}

export async function calificarClasificacionAccion(actividadId: string, elegidas: string[]): Promise<ResultadoCalificacion> {
  const ctx = await contextoCalificacion(actividadId, "clasificacion");
  if (!ctx.ok) return ctx;

  const { puntajeAuto, itemsSnapshot } = calificarClasificacion(
    ctx.contenido as unknown as ContenidoClasificacion,
    elegidas,
  );

  return guardarEntregaCalificada(
    ctx.supabase,
    ctx.estudianteId,
    actividadId,
    { elegidas, itemsSnapshot },
    puntajeAuto,
  );
}

export async function calificarOpcionJustificacionAccion(
  actividadId: string,
  respuestas: RondaRespuesta[],
): Promise<ResultadoCalificacion> {
  const ctx = await contextoCalificacion(actividadId, "opcion_justificacion");
  if (!ctx.ok) return ctx;

  const rondas = rondasDeContenido(ctx.contenido as unknown as ContenidoOpcionJustificacion);
  const resultado = calificarRondas(rondas, respuestas);
  const puntajeAuto = Math.round((resultado.filter((r) => r.correcta).length / resultado.length) * 100);

  return guardarEntregaCalificada(
    ctx.supabase,
    ctx.estudianteId,
    actividadId,
    { rondas: respuestas, resultado },
    puntajeAuto,
  );
}

export async function calificarCorregirOrtografia(actividadId: string, textoReescrito: string): Promise<ResultadoCalificacion> {
  const ctx = await contextoCalificacion(actividadId, "corregir_ortografia");
  if (!ctx.ok) return ctx;

  const contenido = ctx.contenido as unknown as ContenidoOrtografia;
  const calificacion = calificarOrtografia(contenido.texto_correcto, textoReescrito);

  return guardarEntregaCalificada(
    ctx.supabase,
    ctx.estudianteId,
    actividadId,
    { texto_reescrito: textoReescrito, comparacion: calificacion.comparacion, errores: calificacion.errores, aprobado: calificacion.aprobado, totalPalabras: calificacion.totalPalabras },
    calificacion.puntajeAuto,
  );
}

export async function calificarEtiquetadoTextoAccion(actividadId: string, elegidas: string[]): Promise<ResultadoCalificacion> {
  const ctx = await contextoCalificacion(actividadId, "etiquetado_texto");
  if (!ctx.ok) return ctx;

  const { puntajeAuto, itemsSnapshot } = calificarEtiquetado(
    ctx.contenido as unknown as ContenidoEtiquetadoTexto,
    elegidas,
  );

  return guardarEntregaCalificada(
    ctx.supabase,
    ctx.estudianteId,
    actividadId,
    { elegidas, itemsSnapshot },
    puntajeAuto,
  );
}
