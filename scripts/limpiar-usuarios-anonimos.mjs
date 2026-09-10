import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), false, { info: () => {}, error: () => {} });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DIAS_RETENCION = Number.parseInt(process.env.ANON_CLEANUP_DAYS ?? "7", 10);
const CONFIRMACION = "VOZ_Y_PALABRA_LIMPIAR_ANONIMOS";
const aplicar = process.argv.includes("--apply");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.");
if (!Number.isInteger(DIAS_RETENCION) || DIAS_RETENCION < 7) throw new Error("ANON_CLEANUP_DAYS debe ser un entero de al menos 7 días.");
if (aplicar && process.env.ANON_CLEANUP_CONFIRM !== CONFIRMACION) {
  throw new Error(`Limpieza detenida. Para aplicar usa ANON_CLEANUP_CONFIRM=${CONFIRMACION}.`);
}
if (aplicar && process.env.NODE_ENV === "production" && process.env.ANON_CLEANUP_ALLOW_PRODUCTION !== "1") {
  throw new Error("Limpieza detenida: producción requiere ANON_CLEANUP_ALLOW_PRODUCTION=1.");
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const antesDe = Date.now() - DIAS_RETENCION * 24 * 60 * 60 * 1000;

async function consultar(tabla, columna) {
  const { data, error } = await admin.from(tabla).select(columna);
  if (error) throw new Error(`No se pudo consultar ${tabla}: ${error.message}`);
  return new Set((data ?? []).map((fila) => fila[columna]).filter(Boolean));
}

const [estudiantes, reportantes, actores] = await Promise.all([
  consultar("estudiantes", "auth_user_id"),
  consultar("reportes", "reportante_id"),
  consultar("faq_interacciones", "actor_id"),
]);

const candidatos = [];
for (let pagina = 1; ; pagina += 1) {
  const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 1000 });
  if (error) throw new Error(`No se pudo listar usuarios de Auth: ${error.message}`);
  for (const usuario of data.users) {
    const fechaActividad = new Date(usuario.last_sign_in_at ?? usuario.created_at).getTime();
    if (!usuario.is_anonymous || !Number.isFinite(fechaActividad) || fechaActividad > antesDe) continue;
    if (estudiantes.has(usuario.id) || reportantes.has(usuario.id) || actores.has(usuario.id)) continue;
    candidatos.push(usuario);
  }
  if (data.users.length < 1000) break;
}

console.log(JSON.stringify({ modo: aplicar ? "APLICAR" : "SIMULACION", diasRetencion: DIAS_RETENCION, candidatos: candidatos.length }));
if (!aplicar) {
  console.log("No se eliminó ningún usuario. Revisa el conteo y ejecuta de nuevo con --apply y la confirmación explícita.");
  process.exit(0);
}

let eliminados = 0;
for (const usuario of candidatos) {
  const { error } = await admin.auth.admin.deleteUser(usuario.id);
  if (error) throw new Error(`Se detuvo la limpieza después de ${eliminados} eliminaciones: ${error.message}`);
  eliminados += 1;
}
console.log(JSON.stringify({ eliminados }));
