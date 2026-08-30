"use server";

import { calificarVideos, type ContenidoEvaluarVideos } from "@/lib/calificacion-evaluar-videos";
import { calificarOrden, type ContenidoOrdenarFragmentos } from "@/lib/calificacion-ordenar-fragmentos";
import { calificarComparadorChips, esModoChips, type ContenidoComparador } from "@/lib/calificacion-comparador";
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
  return guardarEntregaInterna(ctx.contexto.supabase, actividadId, { marcadas_bien: marcadasBien, marcadas_mal: marcadasMal, resultado }, puntajeAuto, "completada", ctx.contexto.estudianteId);
}

export async function calificarOrdenarFragmentos(actividadId: string, secuencia: number[]): Promise<ResultadoCalificacion> {
  const actividadError = validarActividad(actividadId);
  const secuenciaError = validarListaNumeros(secuencia);
  if (actividadError || secuenciaError) return actividadError ?? secuenciaError!;

  const ctx = await obtenerContextoCalificacion(actividadId, "ordenar_fragmentos");
  if (!ctx.ok) return ctx;
  const { puntajeAuto, resultadoPorPosicion } = calificarOrden(ctx.contexto.contenido as ContenidoOrdenarFragmentos, secuencia);
  return guardarEntregaInterna(ctx.contexto.supabase, actividadId, { orden: secuencia, resultadoPorPosicion }, puntajeAuto, "completada", ctx.contexto.estudianteId);
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
  if (!esModoChips(ctx.contexto.contenido as ContenidoComparador)) {
    return { ok: false, error: "Esta actividad no usa respuestas automáticas. Recarga la página e inténtalo de nuevo." };
  }
  const { puntajeAuto, resultadoCeldas } = calificarComparadorChips(ctx.contexto.contenido as ContenidoComparador, celdas);
  return guardarEntregaInterna(ctx.contexto.supabase, actividadId, { celdas, resultadoCeldas }, puntajeAuto, "completada", ctx.contexto.estudianteId);
}

export async function calificarClasificacionAccion(actividadId: string, elegidas: string[]): Promise<ResultadoCalificacion> {
  const actividadError = validarActividad(actividadId);
  const elegidasError = validarListaTexto(elegidas);
  if (actividadError || elegidasError) return actividadError ?? elegidasError!;

  const ctx = await obtenerContextoCalificacion(actividadId, "clasificacion");
  if (!ctx.ok) return ctx;
  const contenidoOriginal = ctx.contexto.contenido as ContenidoClasificacion;
  const intentosPrevios =
    ctx.contexto.respuestaPrevia && typeof ctx.contexto.respuestaPrevia._meta === "object" && ctx.contexto.respuestaPrevia._meta !== null
      ? Number((ctx.contexto.respuestaPrevia._meta as { intentos?: unknown }).intentos ?? 0)
      : 0;
  const contenido =
    intentosPrevios >= 1 && contenidoOriginal.reintento_alternativo
      ? {
          ...contenidoOriginal,
          ...contenidoOriginal.reintento_alternativo,
          reintento_alternativo: undefined,
        }
      : contenidoOriginal;
  if (!Array.isArray(contenido.elementos) || contenido.elementos.length === 0) {
    return { ok: false, error: "Esta actividad no tiene elementos configurados." };
  }
  if (elegidas.length !== contenido.elementos.length || elegidas.some((eleccion) => !eleccion.trim())) {
    return { ok: false, error: "Clasifica todos los elementos antes de guardar." };
  }
  const categorias = new Set(Array.isArray(contenido.categorias) ? contenido.categorias : []);
  if (categorias.size === 0 || elegidas.some((eleccion) => !categorias.has(eleccion))) {
    return { ok: false, error: "Una de tus categorías ya no es válida. Recarga la actividad." };
  }
  const { puntajeAuto, resultado } = calificarClasificacion(contenido, elegidas);
  return guardarEntregaInterna(ctx.contexto.supabase, actividadId, { elegidas, resultado }, puntajeAuto, "completada", ctx.contexto.estudianteId);
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
  return guardarEntregaInterna(ctx.contexto.supabase, actividadId, { rondas: respuestas, resultado }, puntajeAuto, "completada", ctx.contexto.estudianteId);
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
    {
      texto_reescrito: textoReescrito,
      comparacion: calificacion.comparacion.map(({ escrita, correcto }) => ({ escrita, correcto })),
      errores: calificacion.errores,
      aprobado: calificacion.aprobado,
      totalPalabras: calificacion.totalPalabras,
    },
    calificacion.puntajeAuto,
    "completada",
    ctx.contexto.estudianteId,
  );
}

export async function calificarEtiquetadoTextoAccion(actividadId: string, elegidas: string[]): Promise<ResultadoCalificacion> {
  const actividadError = validarActividad(actividadId);
  const elegidasError = validarListaTexto(elegidas);
  if (actividadError || elegidasError) return actividadError ?? elegidasError!;

  const ctx = await obtenerContextoCalificacion(actividadId, "etiquetado_texto");
  if (!ctx.ok) return ctx;
  const contenido = ctx.contexto.contenido as ContenidoEtiquetadoTexto;
  if (!Array.isArray(contenido.fragmentos) || contenido.fragmentos.length === 0) {
    return { ok: false, error: "Esta actividad no tiene fragmentos configurados." };
  }
  if (elegidas.length !== contenido.fragmentos.length || elegidas.some((eleccion) => !eleccion.trim())) {
    return { ok: false, error: "Etiqueta todos los fragmentos antes de guardar." };
  }
  const etiquetas = new Set(Array.isArray(contenido.etiquetas) ? contenido.etiquetas : []);
  if (etiquetas.size === 0 || elegidas.some((eleccion, indice) => {
    const opciones = contenido.fragmentos[indice]?.opciones;
    return !(opciones?.length ? opciones : [...etiquetas]).includes(eleccion);
  })) {
    return { ok: false, error: "Una de tus etiquetas ya no es válida. Recarga la actividad." };
  }
  const { puntajeAuto, resultado } = calificarEtiquetado(contenido, elegidas);
  return guardarEntregaInterna(ctx.contexto.supabase, actividadId, { elegidas, resultado }, puntajeAuto, "completada", ctx.contexto.estudianteId);
}
