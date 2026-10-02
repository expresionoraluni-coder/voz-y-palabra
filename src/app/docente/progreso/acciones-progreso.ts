"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mensajeError } from "@/lib/mensaje-error";
import { esUuid } from "@/lib/validar-entrega";
import { CONFIRMACION_LIMPIEZA } from "./constantes-progreso";

const MAX_ACTIVIDADES = 100;

type ResultadoError = { ok: false; error: string };

export type ActividadLimpieza = {
  id: string;
  titulo: string;
  unidadId: string;
  unidadNombre: string;
  unidadOrden: number | null;
  orden: number | null;
  conteos: {
    entregas: number;
    reflexiones: number;
    retroalimentaciones: number;
    archivos: number;
  };
};

export type VistaPreviaLimpieza = {
  ok: true;
  grupo: { id: string; nombre: string };
  estudiante: { id: string; nombre: string } | null;
  actividades: ActividadLimpieza[];
  conteos: {
    estudiantes: number;
    entregas: number;
    reflexiones: number;
    retroalimentaciones: number;
    archivos: number;
  };
};

type ResultadoRpc = {
  operacion_id?: string;
  entregas?: number;
  reflexiones?: number;
  retroalimentaciones?: number;
};

function normalizarResultadoRpc(resultado: unknown): ResultadoRpc | null {
  const valor = Array.isArray(resultado) ? resultado[0] : resultado;
  if (!valor || typeof valor !== "object") return null;
  const fila = valor as Record<string, unknown>;
  return {
    operacion_id: typeof fila.operacion_id === "string" ? fila.operacion_id : undefined,
    entregas: typeof fila.entregas === "number" ? fila.entregas : undefined,
    reflexiones: typeof fila.reflexiones === "number" ? fila.reflexiones : undefined,
    retroalimentaciones: typeof fila.retroalimentaciones === "number" ? fila.retroalimentaciones : undefined,
  };
}

type UnidadAnidada = { nombre?: string | null; orden?: number | null } | null;

type ConteosActividad = ActividadLimpieza["conteos"];

function conteosVacios(): ConteosActividad {
  return { entregas: 0, reflexiones: 0, retroalimentaciones: 0, archivos: 0 };
}

function datosUnidad(unidades: unknown) {
  const unidad = (Array.isArray(unidades) ? unidades[0] : unidades) as UnidadAnidada;
  return {
    nombre: unidad?.nombre ?? "Sin unidad",
    orden: unidad?.orden ?? null,
  };
}

function idsValidos(actividadIds: string[]) {
  return Array.isArray(actividadIds)
    && actividadIds.length > 0
    && actividadIds.length <= MAX_ACTIVIDADES
    && actividadIds.every(esUuid);
}

async function validarDocenteYAlcance(grupoId: string, estudianteId?: string) {
  if (!esUuid(grupoId)) return { ok: false as const, error: "El grupo no es válido." };
  if (estudianteId !== undefined && !esUuid(estudianteId)) {
    return { ok: false as const, error: "El estudiante no es válido." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous === true) {
    return { ok: false as const, error: "Tu sesión docente expiró. Entra de nuevo para continuar." };
  }

  const admin = createAdminClient();
  const { data: grupo, error: grupoError } = await admin
    .from("grupos")
    .select("id, nombre")
    .eq("id", grupoId)
    .eq("docente_id", user.id)
    .maybeSingle();
  if (grupoError || !grupo) return { ok: false as const, error: "No tienes permiso sobre este grupo." };

  let estudiante: { id: string; nombre: string } | null = null;
  if (estudianteId) {
    const { data, error } = await admin
      .from("estudiantes")
      .select("id, nombre")
      .eq("id", estudianteId)
      .eq("grupo_id", grupoId)
      .maybeSingle();
    if (error || !data) return { ok: false as const, error: "El estudiante no pertenece a este grupo." };
    estudiante = data;
  }

  return { ok: true as const, admin, grupo, estudiante, docenteId: user.id };
}

export async function previsualizarLimpiezaProgreso(
  grupoId: string,
  actividadIds: string[],
  estudianteId?: string,
): Promise<VistaPreviaLimpieza | ResultadoError> {
  if (!idsValidos(actividadIds)) {
    return { ok: false, error: "Selecciona actividades válidas para continuar." };
  }

  const idsUnicos = [...new Set(actividadIds)];
  const acceso = await validarDocenteYAlcance(grupoId, estudianteId);
  if (!acceso.ok) return acceso;

  const { admin, grupo, estudiante } = acceso;
  const { data: actividades, error: actividadesError } = await admin
    .from("actividades")
    .select("id, titulo, orden, unidad_id, unidades(nombre, orden)")
    .in("id", idsUnicos)
    .order("id");
  if (actividadesError) return { ok: false, error: mensajeError(actividadesError) };
  if ((actividades?.length ?? 0) !== idsUnicos.length) {
    return { ok: false, error: "Una o más actividades ya no existen en el catálogo." };
  }

  const estudiantesQuery = admin
    .from("estudiantes")
    .select("id")
    .eq("grupo_id", grupoId);
  if (estudianteId) estudiantesQuery.eq("id", estudianteId);
  const { data: estudiantes, error: estudiantesError } = await estudiantesQuery;
  if (estudiantesError) return { ok: false, error: mensajeError(estudiantesError) };
  const estudiantesIds = (estudiantes ?? []).map((item) => item.id as string);
  const actividadesConConteos = new Map<string, ConteosActividad>(
    idsUnicos.map((id) => [id, conteosVacios()]),
  );

  if (estudiantesIds.length > 0) {
    const [{ data: entregas, error: entregasError }, { data: reflexiones, error: reflexionesError }] = await Promise.all([
      admin
        .from("entregas")
        .select("id, actividad_id, archivo_url")
        .in("estudiante_id", estudiantesIds)
        .in("actividad_id", idsUnicos),
      admin
        .from("reflexiones")
        .select("id, actividad_id")
        .in("estudiante_id", estudiantesIds)
        .in("actividad_id", idsUnicos),
    ]);
    if (entregasError) return { ok: false, error: mensajeError(entregasError) };
    if (reflexionesError) return { ok: false, error: mensajeError(reflexionesError) };

    const entregasIds = (entregas ?? []).map((item) => item.id as string);
    const entregaActividad = new Map<string, string>(
      (entregas ?? []).map((item) => [item.id as string, item.actividad_id as string]),
    );
    for (const entrega of entregas ?? []) {
      const conteos = actividadesConConteos.get(entrega.actividad_id as string);
      if (!conteos) continue;
      conteos.entregas += 1;
      if (Boolean(entrega.archivo_url)) conteos.archivos += 1;
    }
    for (const reflexion of reflexiones ?? []) {
      const conteos = actividadesConConteos.get(reflexion.actividad_id as string);
      if (conteos) conteos.reflexiones += 1;
    }

    const { data: retroalimentaciones, error: retroalimentacionesError } = entregasIds.length
      ? await admin
        .from("retroalimentacion_docente")
        .select("id, entrega_id")
        .in("entrega_id", entregasIds)
      : { data: [], error: null };
    if (retroalimentacionesError) return { ok: false, error: mensajeError(retroalimentacionesError) };
    for (const retroalimentacion of retroalimentaciones ?? []) {
      const actividadId = entregaActividad.get(retroalimentacion.entrega_id as string);
      const conteos = actividadId ? actividadesConConteos.get(actividadId) : undefined;
      if (conteos) conteos.retroalimentaciones += 1;
    }
  }

  const actividadesConDetalle = actividades.map((actividad) => {
    const unidad = datosUnidad(actividad.unidades);
    return {
      id: actividad.id,
      titulo: actividad.titulo,
      unidadId: actividad.unidad_id,
      unidadNombre: unidad.nombre,
      unidadOrden: unidad.orden,
      orden: actividad.orden ?? null,
      conteos: actividadesConConteos.get(actividad.id) ?? conteosVacios(),
    };
  });
  const conteosTotales = actividadesConDetalle.reduce(
    (totales, actividad) => ({
      entregas: totales.entregas + actividad.conteos.entregas,
      reflexiones: totales.reflexiones + actividad.conteos.reflexiones,
      retroalimentaciones: totales.retroalimentaciones + actividad.conteos.retroalimentaciones,
      archivos: totales.archivos + actividad.conteos.archivos,
    }),
    conteosVacios(),
  );

  return {
    ok: true,
    grupo,
    estudiante,
    actividades: actividadesConDetalle,
    conteos: {
      estudiantes: estudiantesIds.length,
      ...conteosTotales,
    },
  };
}

export async function limpiarProgresoActividad(
  grupoId: string,
  actividadIds: string[],
  conteosEsperados: Pick<VistaPreviaLimpieza["conteos"], "entregas" | "reflexiones" | "retroalimentaciones">,
  confirmacion: string,
  estudianteId?: string,
): Promise<{
  ok: true;
  operacionId: string;
  eliminadas: { entregas: number; reflexiones: number; retroalimentaciones: number };
} | ResultadoError> {
  if (!idsValidos(actividadIds)) return { ok: false, error: "La selección de actividades no es válida." };
  if (confirmacion !== CONFIRMACION_LIMPIEZA) return { ok: false, error: `Escribe exactamente ${CONFIRMACION_LIMPIEZA} para confirmar.` };
  if (!conteosEsperados || typeof conteosEsperados !== "object"
    || !Number.isInteger(conteosEsperados.entregas)
    || !Number.isInteger(conteosEsperados.reflexiones)
    || !Number.isInteger(conteosEsperados.retroalimentaciones)
    || conteosEsperados.entregas < 0
    || conteosEsperados.reflexiones < 0
    || conteosEsperados.retroalimentaciones < 0) {
    return { ok: false, error: "La vista previa ya no es válida. Vuelve a generarla." };
  }

  const acceso = await validarDocenteYAlcance(grupoId, estudianteId);
  if (!acceso.ok) return acceso;

  const { data: resultado, error: rpcError } = await acceso.admin.rpc("limpiar_progreso_actividad_docente", {
    p_docente_id: acceso.docenteId,
    p_grupo_id: grupoId,
    p_actividad_ids: [...new Set(actividadIds)],
    p_estudiante_id: estudianteId ?? null,
    p_conteo_entregas: conteosEsperados.entregas,
    p_conteo_reflexiones: conteosEsperados.reflexiones,
    p_conteo_retroalimentaciones: conteosEsperados.retroalimentaciones,
  });
  if (rpcError) {
    return {
      ok: false,
      error: mensajeError(rpcError, {
        PGRST202: "La limpieza de progreso todavía no está habilitada en la base de datos. No se modificó ningún dato; avisa a administración para activar la actualización.",
        40001: "La información cambió mientras confirmabas. Vuelve a generar la vista previa antes de intentarlo de nuevo.",
        22023: "La selección ya no es válida. Vuelve a generar la vista previa antes de intentarlo de nuevo.",
        42501: "Tu sesión docente no tiene permiso sobre este grupo o estudiante.",
        "42P01": "La actualización de mantenimiento no está completa en la base de datos. No se modificó ningún dato; avisa a administración.",
        42883: "La actualización de mantenimiento no está habilitada en la base de datos. No se modificó ningún dato; avisa a administración.",
      }),
    };
  }

  const resumen = normalizarResultadoRpc(resultado);
  if (!resumen?.operacion_id) return { ok: false, error: "La base de datos no devolvió el comprobante de la operación. No se confirmó ningún cambio; vuelve a intentarlo." };

  revalidatePath(`/docente/grupos/${grupoId}`);
  revalidatePath("/docente/dashboard");
  if (estudianteId) revalidatePath(`/docente/estudiantes/${estudianteId}`);

  return {
    ok: true,
    operacionId: resumen.operacion_id,
    eliminadas: {
      entregas: resumen.entregas ?? 0,
      reflexiones: resumen.reflexiones ?? 0,
      retroalimentaciones: resumen.retroalimentaciones ?? 0,
    },
  };
}
