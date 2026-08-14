"use server";

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
import {
  guardarEntregaInterna,
  obtenerContextoCalificacion,
  type ResultadoCalificacion,
} from "@/lib/estudiante-entregas-server";
import { esUuid, validarLista, validarTexto } from "@/lib/validar-entrega";
import { validarJustificacion } from "@/lib/validar-justificacion";

export type { ResultadoCalificacion } from "@/lib/estudiante-entregas-server";

const errorEntrada = "La respuesta no tiene un formato válido. Revisa tu actividad e inténtalo de nuevo.";

function validarActividad(actividadId: string): ResultadoCalificacion | null {
  return esUuid(actividadId) ? null : { ok: false, error: "La actividad no es válida." };
}
function validarListaTexto(valor: unknown, maximo = 100): ResultadoCalificacion | null {
  return validarLista<string>(valor, {
    nombre: "respuesta",
    maximo,
    validarElemento: (elemento) => typeof elemento === "string" && elemento.length <= 500,
  })
    ? null
    : { ok: false, error: errorEntrada };
}

function validarListaNumeros(valor: unknown, maximo = 100): ResultadoCalificacion | null {
  return validarLista<number>(valor, {
    nombre: "respuesta",
    maximo,
    validarElemento: (elemento) => typeof elemento === "number" && Number.isInteger(elemento) && elemento >= 0,
  })
    ? null
    : { ok: false, error: errorEntrada };
}

export async function calificarEvaluarVideos(
  actividadId: string,
  marcadasBien: string[],
  marcadasMal: string[],
): Promise<ResultadoCalificacion> {
  const actividadError = validarActividad(actividadId);
  const bienError = validarListaTexto(marcadasBien);
  const malError = validarListaTexto(marcadasMal);
  if (actividadError || bienError || malError) return actividadError ?? bienError ?? malError!;

  const ctx = await obtenerContextoCalificacion(actividadId, "evaluar_videos");
  if (!ctx.ok) return ctx;
  const { puntajeAuto, resultado } = calificarVideos(ctx.contexto.contenido as ContenidoEvaluarVideos, marcadasBien, marcadasMal);
  return guardarEntregaInterna(ctx.contexto.supabase, actividadId, { marcadas_bien: marcadasBien, marcadas_mal: marcadasMal, resultado }, puntajeAuto);
}

export async function calificarOrdenarFragmentos(actividadId: string, secuencia: number[]): Promise<ResultadoCalificacion> {
  const actividadError = validarActividad(actividadId);
  const secuenciaError = validarListaNumeros(secuencia);
  if (actividadError || secuenciaError) return actividadError ?? secuenciaError!;

  const ctx = await obtenerContextoCalificacion(actividadId, "ordenar_fragmentos");
  if (!ctx.ok) return ctx;
  const { puntajeAuto, resultadoPorPosicion } = calificarOrden(ctx.contexto.contenido as ContenidoOrdenarFragmentos, secuencia);
  return guardarEntregaInterna(ctx.contexto.supabase, actividadId, { orden: secuencia, resultadoPorPosicion }, puntajeAuto);
}

export async function calificarComparadorChipsAccion(actividadId: string, celdas: string[][]): Promise<ResultadoCalificacion> {
  const actividadError = validarActividad(actividadId);
  const celdasError = validarLista<string[]>(celdas, {
    nombre: "respuesta",
    maximo: 100,
    validarElemento: (fila) => Array.isArray(fila) && fila.length <= 20 && fila.every((celda) => typeof celda === "string" && celda.length <= 500),
  })
    ? null
    : { ok: false, error: errorEntrada } as ResultadoCalificacion;
  if (actividadError || celdasError) return actividadError ?? celdasError!;

  const ctx = await obtenerContextoCalificacion(actividadId, "comparador");
  if (!ctx.ok) return ctx;
  const { puntajeAuto, resultadoCeldas } = calificarComparadorChips(ctx.contexto.contenido as ContenidoComparador, celdas);
  return guardarEntregaInterna(ctx.contexto.supabase, actividadId, { celdas, resultadoCeldas }, puntajeAuto);
}

export async function calificarClasificacionAccion(actividadId: string, elegidas: string[]): Promise<ResultadoCalificacion> {
  const actividadError = validarActividad(actividadId);
  const elegidasError = validarListaTexto(elegidas);
  if (actividadError || elegidasError) return actividadError ?? elegidasError!;

  const ctx = await obtenerContextoCalificacion(actividadId, "clasificacion");
  if (!ctx.ok) return ctx;
  const { puntajeAuto, itemsSnapshot } = calificarClasificacion(ctx.contexto.contenido as ContenidoClasificacion, elegidas);
  return guardarEntregaInterna(ctx.contexto.supabase, actividadId, { elegidas, itemsSnapshot }, puntajeAuto);
}

export async function calificarOpcionJustificacionAccion(
  actividadId: string,
  respuestas: RondaRespuesta[],
): Promise<ResultadoCalificacion> {
  const actividadError = validarActividad(actividadId);
  const respuestasError = validarLista<RondaRespuesta>(respuestas, {
    nombre: "respuesta",
    maximo: 50,
    validarElemento: (respuesta) => {
      if (!respuesta || typeof respuesta !== "object" || Array.isArray(respuesta)) return false;
      const respuestaRegistro = respuesta as Record<string, unknown>;
      return (
        typeof respuestaRegistro.opcion === "string" &&
        typeof respuestaRegistro.justificacion === "string" &&
        respuestaRegistro.opcion.length <= 500 &&
        respuestaRegistro.justificacion.length <= 2_000
      );
    },
  })
    ? null
    : { ok: false, error: errorEntrada } as ResultadoCalificacion;
  if (actividadError || respuestasError) return actividadError ?? respuestasError!;

  const ctx = await obtenerContextoCalificacion(actividadId, "opcion_justificacion");
  if (!ctx.ok) return ctx;
  const rondas = rondasDeContenido(ctx.contexto.contenido as ContenidoOpcionJustificacion);
  if (rondas.length === 0) return { ok: false, error: "Esta actividad no tiene preguntas configuradas." };
  if (respuestas.length !== rondas.length) {
    return { ok: false, error: "Faltan respuestas por completar en esta actividad." };
  }
  const respuestaInvalida = respuestas.findIndex(
    (respuesta, indice) =>
      !rondas[indice].opciones.includes(respuesta.opcion) ||
      validarJustificacion(respuesta.justificacion, respuesta.opcion) !== null,
  );
  if (respuestaInvalida !== -1) {
    return { ok: false, error: `Completa la explicación de la pregunta ${respuestaInvalida + 1} antes de guardar.` };
  }
  const resultado = calificarRondas(rondas, respuestas);
  const puntajeAuto = Math.round((resultado.filter((r) => r.correcta).length / resultado.length) * 100);
  return guardarEntregaInterna(ctx.contexto.supabase, actividadId, { rondas: respuestas, resultado }, puntajeAuto);
}

export async function calificarCorregirOrtografia(actividadId: string, textoReescrito: string): Promise<ResultadoCalificacion> {
  const actividadError = validarActividad(actividadId);
  const textoError = validarTexto(textoReescrito, { nombre: "El texto", maximo: 12_000, obligatorio: true });
  if (actividadError || textoError) return actividadError ?? { ok: false, error: textoError! };

  const ctx = await obtenerContextoCalificacion(actividadId, "corregir_ortografia");
  if (!ctx.ok) return ctx;
  const contenido = ctx.contexto.contenido as ContenidoOrtografia;
  const calificacion = calificarOrtografia(contenido.texto_correcto, textoReescrito);
  return guardarEntregaInterna(
    ctx.contexto.supabase,
    actividadId,
    { texto_reescrito: textoReescrito, comparacion: calificacion.comparacion, errores: calificacion.errores, aprobado: calificacion.aprobado, totalPalabras: calificacion.totalPalabras },
    calificacion.puntajeAuto,
  );
}

export async function calificarEtiquetadoTextoAccion(actividadId: string, elegidas: string[]): Promise<ResultadoCalificacion> {
  const actividadError = validarActividad(actividadId);
  const elegidasError = validarListaTexto(elegidas);
  if (actividadError || elegidasError) return actividadError ?? elegidasError!;

  const ctx = await obtenerContextoCalificacion(actividadId, "etiquetado_texto");
  if (!ctx.ok) return ctx;
  const { puntajeAuto, itemsSnapshot } = calificarEtiquetado(ctx.contexto.contenido as ContenidoEtiquetadoTexto, elegidas);
  return guardarEntregaInterna(ctx.contexto.supabase, actividadId, { elegidas, itemsSnapshot }, puntajeAuto);
}
