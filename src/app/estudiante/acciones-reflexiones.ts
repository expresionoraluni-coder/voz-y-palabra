"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { esUuid, validarTexto } from "@/lib/validar-entrega";
import { entregaCuentaComoCompletada, unidadEstaCompleta } from "@/lib/progreso-unidad";
import { validarAccesoActividad, validarAccesoUnidad } from "@/lib/estudiante-entregas-server";

type Resultado = { ok: true } | { ok: false; error: string };

async function obtenerEstudiante() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous !== true) {
    return { ok: false as const, error: "Tu sesión de estudiante ya no es válida. Entra de nuevo." };
  }

  const admin = createAdminClient();
  const { data: estudiante, error } = await admin
    .from("estudiantes")
    .select("id, grupo_id, debe_cambiar_nip")
    .eq("auth_user_id", user.id)
    .eq("activo", true)
    .single();
  if (error || !estudiante || estudiante.debe_cambiar_nip) {
    return { ok: false as const, error: "No encontramos tu sesión de estudiante. Entra de nuevo." };
  }

  return { ok: true as const, supabase, admin, estudiante };
}

async function cargarActividad(
  admin: ReturnType<typeof createAdminClient>,
  actividadId: string,
) {
  const { data: actividad, error } = await admin
    .from("actividades")
    .select("id, unidad_id, requiere_actividad_id, unidades(orden)")
    .eq("id", actividadId)
    .maybeSingle();
  if (error || !actividad) return null;

  const unidad = Array.isArray(actividad.unidades) ? actividad.unidades[0] : actividad.unidades;
  return {
    id: actividad.id,
    unidad_id: actividad.unidad_id,
    requiere_actividad_id: actividad.requiere_actividad_id,
    unidad_orden: Number(unidad?.orden ?? 1),
  };
}

export async function guardarPrediccionActividad(
  actividadId: string,
  confianza: number,
): Promise<Resultado> {
  if (!esUuid(actividadId) || !Number.isInteger(confianza) || confianza < 1 || confianza > 5) {
    return { ok: false, error: "El nivel de seguridad no es válido." };
  }
  const acceso = await obtenerEstudiante();
  if (!acceso.ok) return acceso;

  const actividad = await cargarActividad(acceso.admin, actividadId);
  if (!actividad) return { ok: false, error: "No encontramos esta actividad." };
  const permitido = await validarAccesoActividad(acceso.supabase, acceso.admin, acceso.estudiante.id, {
    id: actividad.id,
    unidadId: actividad.unidad_id,
    requiereActividadId: actividad.requiere_actividad_id,
    unidadOrden: actividad.unidad_orden,
  });
  if (!permitido.ok) return { ok: false, error: permitido.error };

  const { error } = await acceso.admin.from("reflexiones").insert(
    {
      estudiante_id: acceso.estudiante.id,
      actividad_id: actividadId,
      // Las reflexiones y predicciones de actividad se identifican por
      // actividad. unidad_id se reserva para el cierre de la unidad, porque
      // el índice de unidad debe permitir una sola reflexión final por unidad.
      unidad_id: null,
      momento: "prediccion",
      texto: null,
      confianza,
    },
  );
  return error ? { ok: false, error: "No pudimos guardar tu nivel de seguridad. Quizá ya quedó guardado." } : { ok: true };
}

export async function guardarReflexionActividad(
  actividadId: string,
  texto: string,
): Promise<Resultado> {
  if (!esUuid(actividadId)) return { ok: false, error: "La actividad no es válida." };
  const errorTexto = validarTexto(texto, { nombre: "La reflexión", maximo: 5_000, obligatorio: true });
  if (errorTexto) return { ok: false, error: errorTexto };
  const acceso = await obtenerEstudiante();
  if (!acceso.ok) return acceso;

  const actividad = await cargarActividad(acceso.admin, actividadId);
  if (!actividad) return { ok: false, error: "No encontramos esta actividad." };
  const permitido = await validarAccesoActividad(acceso.supabase, acceso.admin, acceso.estudiante.id, {
    id: actividad.id,
    unidadId: actividad.unidad_id,
    requiereActividadId: actividad.requiere_actividad_id,
    unidadOrden: actividad.unidad_orden,
  });
  if (!permitido.ok) return { ok: false, error: permitido.error };
  const { data: entrega } = await acceso.supabase
    .from("entregas")
    .select("puntaje_auto, respuesta")
    .eq("estudiante_id", acceso.estudiante.id)
    .eq("actividad_id", actividadId)
    .maybeSingle();
  if (!entrega || !entregaCuentaComoCompletada(entrega)) {
    return { ok: false, error: "Guarda primero tu respuesta de la actividad." };
  }

  const { error } = await acceso.admin.from("reflexiones").insert(
    {
      estudiante_id: acceso.estudiante.id,
      actividad_id: actividadId,
      unidad_id: null,
      momento: "cierre",
      texto: texto.trim(),
    },
  );
  return error ? { ok: false, error: "No pudimos guardar tu reflexión. Quizá ya quedó guardada." } : { ok: true };
}

export async function guardarReflexionUnidad(unidadId: string, texto: string): Promise<Resultado> {
  if (!esUuid(unidadId)) return { ok: false, error: "La unidad no es válida." };
  const errorTexto = validarTexto(texto, { nombre: "La reflexión", maximo: 5_000, obligatorio: true });
  if (errorTexto) return { ok: false, error: errorTexto };
  const acceso = await obtenerEstudiante();
  if (!acceso.ok) return acceso;

  const { data: unidad } = await acceso.admin
    .from("unidades")
    .select("id, orden, actividades(id, orden)")
    .eq("id", unidadId)
    .maybeSingle();
  if (!unidad) return { ok: false, error: "No encontramos esta unidad." };

  const accesoUnidad = await validarAccesoUnidad(
    acceso.supabase,
    acceso.admin,
    acceso.estudiante.id,
    unidadId,
  );
  if (!accesoUnidad.ok) return { ok: false, error: accesoUnidad.error };

  const actividades = Array.isArray(unidad.actividades) ? unidad.actividades : [];
  const ids = actividades.map((actividad: { id: string }) => actividad.id);
  const { data: entregas } = ids.length
    ? await acceso.supabase
        .from("entregas")
        .select("actividad_id, puntaje_auto, respuesta")
        .eq("estudiante_id", acceso.estudiante.id)
        .in("actividad_id", ids)
    : { data: [] as { actividad_id: string; puntaje_auto: number | null; respuesta: unknown }[] };
  const completadas = new Set(
    (entregas ?? []).filter(entregaCuentaComoCompletada).map((entrega) => entrega.actividad_id),
  ).size;
  if (!unidadEstaCompleta(ids.length, completadas)) {
    return { ok: false, error: "Completa todas las actividades antes de guardar la reflexión de la unidad." };
  }

  const ultimaActividad = actividades.slice().sort(
    (a: { orden: number }, b: { orden: number }) => b.orden - a.orden,
  )[0];
  if (ultimaActividad) {
    const { data: reflexionUltima } = await acceso.supabase
      .from("reflexiones")
      .select("id")
      .eq("estudiante_id", acceso.estudiante.id)
      .eq("actividad_id", ultimaActividad.id)
      .eq("momento", "cierre")
      .maybeSingle();
    if (!reflexionUltima) {
      return { ok: false, error: "Guarda primero la reflexión de la última actividad." };
    }
  }

  const { error } = await acceso.admin.from("reflexiones").insert(
    {
      estudiante_id: acceso.estudiante.id,
      unidad_id: unidadId,
      actividad_id: null,
      momento: "cierre",
      texto: texto.trim(),
    },
  );
  return error ? { ok: false, error: "No pudimos guardar la reflexión. Quizá ya quedó guardada." } : { ok: true };
}

export async function guardarConfianzaUnidad(
  unidadId: string,
  momento: "inicio" | "cierre",
  valor: number,
): Promise<Resultado> {
  if (!esUuid(unidadId) || !["inicio", "cierre"].includes(momento) || !Number.isInteger(valor) || valor < 0 || valor > 100) {
    return { ok: false, error: "El nivel de seguridad no es válido." };
  }
  const acceso = await obtenerEstudiante();
  if (!acceso.ok) return acceso;
  const permitido = await validarAccesoUnidad(
    acceso.supabase,
    acceso.admin,
    acceso.estudiante.id,
    unidadId,
    momento === "cierre",
  );
  if (!permitido.ok) return { ok: false, error: permitido.error };

  const { data: existente } = await acceso.supabase
    .from("autoevaluaciones_confianza")
    .select("id")
    .eq("estudiante_id", acceso.estudiante.id)
    .eq("unidad_id", unidadId)
    .eq("momento", momento)
    .maybeSingle();
  if (existente) return { ok: false, error: "Este nivel de seguridad ya quedó guardado." };

  const { data: actividades } = await acceso.admin.from("actividades").select("id").eq("unidad_id", unidadId);
  const ids = (actividades ?? []).map((actividad) => actividad.id);
  if (momento === "inicio" && ids.length) {
    const { data: entregas } = await acceso.supabase
      .from("entregas")
      .select("id")
      .eq("estudiante_id", acceso.estudiante.id)
      .in("actividad_id", ids);
    if (entregas?.length) return { ok: false, error: "La confianza inicial solo se registra antes del primer intento." };
  }
  if (momento === "cierre") {
    const { data: entregas } = ids.length
      ? await acceso.supabase
          .from("entregas")
          .select("actividad_id, puntaje_auto, respuesta")
          .eq("estudiante_id", acceso.estudiante.id)
          .in("actividad_id", ids)
      : { data: [] as { actividad_id: string; puntaje_auto: number | null; respuesta: unknown }[] };
    const completadas = new Set(
      (entregas ?? []).filter((entrega) => entregaCuentaComoCompletada(entrega)).map((entrega) => entrega.actividad_id),
    ).size;
    if (!unidadEstaCompleta(ids.length, completadas)) {
      return { ok: false, error: "Completa todas las actividades antes de registrar tu confianza final." };
    }
  }

  const { error } = await acceso.admin.from("autoevaluaciones_confianza").insert({
    estudiante_id: acceso.estudiante.id,
    unidad_id: unidadId,
    momento,
    valor,
  });
  return error ? { ok: false, error: "No pudimos guardar tu nivel de seguridad. Quizá ya quedó guardado." } : { ok: true };
}

export async function guardarBitacoraMeta(unidadId: string, meta: string): Promise<Resultado> {
  if (!esUuid(unidadId)) return { ok: false, error: "La unidad no es válida." };
  const errorTexto = validarTexto(meta, { nombre: "La meta", maximo: 2000, obligatorio: true });
  if (errorTexto) return { ok: false, error: errorTexto };
  const acceso = await obtenerEstudiante();
  if (!acceso.ok) return acceso;
  const permitido = await validarAccesoUnidad(acceso.supabase, acceso.admin, acceso.estudiante.id, unidadId, false);
  if (!permitido.ok) return { ok: false, error: permitido.error };
  const { data: existente } = await acceso.supabase
    .from("bitacora")
    .select("id")
    .eq("estudiante_id", acceso.estudiante.id)
    .eq("unidad_id", unidadId)
    .maybeSingle();
  if (existente) return { ok: false, error: "La meta de esta unidad ya quedó guardada." };
  const { error } = await acceso.admin.from("bitacora").insert({
    estudiante_id: acceso.estudiante.id,
    unidad_id: unidadId,
    meta: meta.trim(),
    cumplida: false,
  });
  return error ? { ok: false, error: "No pudimos guardar tu meta. Quizá ya quedó guardada." } : { ok: true };
}

export async function alternarBitacoraCumplida(unidadId: string): Promise<Resultado> {
  if (!esUuid(unidadId)) return { ok: false, error: "La unidad no es válida." };
  const acceso = await obtenerEstudiante();
  if (!acceso.ok) return acceso;
  const { data: bitacora } = await acceso.supabase
    .from("bitacora")
    .select("id, cumplida")
    .eq("estudiante_id", acceso.estudiante.id)
    .eq("unidad_id", unidadId)
    .maybeSingle();
  if (!bitacora) return { ok: false, error: "Primero guarda la meta de la unidad." };
  const { error } = await acceso.admin
    .from("bitacora")
    .update({ cumplida: !bitacora.cumplida })
    .eq("id", bitacora.id);
  return error ? { ok: false, error: "No pudimos actualizar tu meta." } : { ok: true };
}
