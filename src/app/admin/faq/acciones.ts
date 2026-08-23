"use server";

import { revalidatePath } from "next/cache";
import { obtenerAdministrador } from "@/lib/supabase/requerir-administrador";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function texto(valor: unknown, maximo: number) {
  if (typeof valor !== "string") return null;
  const resultado = valor.trim();
  return resultado.length > 0 && resultado.length <= maximo ? resultado : null;
}

export async function guardarArticuloFaq(input: {
  id: string;
  titulo: string;
  resumen: string;
  pasos: string[];
}) {
  const acceso = await obtenerAdministrador();
  if (!acceso) return { ok: false, error: "Tu sesión administrativa ya no está activa." };
  if (!UUID.test(input.id)) return { ok: false, error: "El artículo no es válido." };
  const titulo = texto(input.titulo, 160);
  const resumen = texto(input.resumen, 500);
  const pasos = input.pasos.map((paso) => texto(paso, 500)).filter((paso): paso is string => paso !== null).slice(0, 8);
  if (!titulo || !resumen || pasos.length === 0) {
    return { ok: false, error: "Completa título, resumen y al menos un paso." };
  }

  const { error } = await acceso.supabase
    .from("faq_articulos")
    .update({ titulo, resumen, pasos, actualizado_por: acceso.user.id, updated_at: new Date().toISOString() })
    .eq("id", input.id);
  if (error) return { ok: false, error: "No pudimos guardar el artículo." };

  revalidatePath("/admin/faq");
  return { ok: true };
}

export async function cambiarEstadoArticuloFaq(id: string, activo: boolean) {
  const acceso = await obtenerAdministrador();
  if (!acceso) return { ok: false, error: "Tu sesión administrativa ya no está activa." };
  if (!UUID.test(id)) return { ok: false, error: "El artículo no es válido." };

  const { error } = await acceso.supabase.from("faq_articulos").update({ activo, actualizado_por: acceso.user.id, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: "No pudimos cambiar el estado del artículo." };

  revalidatePath("/admin/faq");
  return { ok: true };
}
