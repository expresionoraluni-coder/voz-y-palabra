import { readFile } from "node:fs/promises";
import { glob } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const requiredActions = [
  "src/app/estudiante/actividad/[id]/acciones-entrega.ts",
  "src/app/estudiante/actividad/[id]/acciones-calificacion.ts",
  "src/app/docente/estudiantes/[id]/acciones-apoyo.ts",
  "src/app/docente/grupos/[id]/acciones-estudiantes.ts",
];

const failures = [];

async function texto(ruta) {
  return readFile(new URL(ruta, ROOT), "utf8");
}

for await (const ruta of glob("src/**/acciones*.ts", { cwd: ROOT.pathname })) {
  const contenido = await texto(ruta);
  if (!contenido.startsWith('"use server";')) {
    failures.push(`${ruta}: debe ser una Server Action con \"use server\".`);
  }
}

for (const ruta of requiredActions) {
  const contenido = await texto(ruta);
  if (!contenido.includes('"use server";')) failures.push(`${ruta}: falta \"use server\".`);
}

const apoyo = await texto("src/app/docente/estudiantes/[id]/acciones-apoyo.ts");
const lote = await texto("src/app/docente/grupos/[id]/acciones-estudiantes.ts");
for (const [nombre, contenido] of [["acciones-apoyo", apoyo], ["acciones-estudiantes", lote]]) {
  if (!contenido.includes("auth.getUser()")) failures.push(`${nombre}: debe validar la sesión actual.`);
  if (!contenido.includes("user.id")) failures.push(`${nombre}: debe comprobar la identidad autorizada.`);
  if (!contenido.includes("createAdminClient")) failures.push(`${nombre}: las mutaciones privilegiadas deben permanecer en servidor.`);
}
if (!lote.includes('.eq("docente_id", user.id)')) failures.push("acciones-estudiantes: falta la comprobación de propiedad del grupo.");
if (!lote.includes('.eq("grupo_id", grupoId)')) failures.push("acciones-estudiantes: falta limitar la mutación al grupo validado.");

const schema = await texto("supabase/schema.sql");
const functions = await texto("supabase/functions.sql");
const accionesEntrega = await texto("src/app/estudiante/actividad/[id]/acciones-entrega.ts");
const contextoEntregas = await texto("src/lib/estudiante-entregas-server.ts");
const videoEmbed = await texto("src/lib/video-embed.ts");
const workflow = await texto(".github/workflows/quality.yml");
if (schema.includes('create policy "estudiante edita su propia fila"')) {
  failures.push("schema: el estudiante no debe tener una policy de UPDATE sobre su fila.");
}
if (!schema.includes("auth_user_id = (select auth.uid()) and activo = true")) {
  failures.push("schema: la lectura de la fila del estudiante debe exigir activo = true.");
}
if (functions.includes("estudiante_tiene_nip")) {
  failures.push("functions: estudiante_tiene_nip es legado y no debe formar parte de la reconstrucción.");
}
if (!functions.includes("returns integer language plpgsql security definer")) {
  failures.push("functions: el alta de estudiantes no debe devolver filas completas con datos sensibles.");
}
if (/create\s+policy\s+"cualquiera con sesi[oó]n lee (actividades|unidades)"/i.test(schema)) {
  failures.push("supabase/schema.sql: no debe restaurar las policies de lectura abierta.");
}
if (functions.includes("auth.role()")) failures.push("supabase/functions.sql: auth.role() está deprecado y no debe usarse.");
if (!schema.includes('to authenticated')) failures.push("supabase/schema.sql: faltan policies dirigidas explícitamente a authenticated.");
if (!functions.includes("proteger_columnas_entrega")) failures.push("supabase/functions.sql: falta la protección de columnas de entregas.");

if (!contextoEntregas.includes("validarAccesoActividad")) failures.push("entregas: falta el guard server-side de prerrequisitos.");
if (!accionesEntrega.includes("validarEntregaAbiertaPorTipo")) failures.push("entregas: faltan validaciones server-side por tipo.");
if (!functions.includes("from public.estudiantes e where e.grupo_id = v_grupo.id and public.normalizar_nombre(e.nombre) = public.normalizar_nombre(p_nombre)\n    for update")) {
  failures.push("functions: el ingreso estudiantil debe bloquear la fila antes de actualizar intentos.");
}
if (!functions.includes("debe_cambiar_nip = true") || !functions.includes("extensions.gen_random_bytes(2)")) {
  failures.push("functions: el reinicio de NIP debe emitir un temporal y forzar su cambio.");
}
if (!schema.includes("actividades_video_url_https_check") || !videoEmbed.includes("esVideoUrlPermitida")) {
  failures.push("video: las URLs deben estar restringidas a HTTPS y hosts permitidos.");
}
if (!schema.includes("revoke select on public.docentes from public, anon, authenticated") || !functions.includes("grant select (id, nombre, created_at) on public.docentes to authenticated")) {
  failures.push("docentes: el correo no debe quedar expuesto por el Data API.");
}
if (!workflow.includes("cp ../supabase/migrations/*.sql supabase/migrations/") || !workflow.includes("version: 2.101.0")) {
  failures.push("CI: debe aplicar las migraciones versionadas y fijar la versiÃ³n de Supabase CLI.");
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `✗ ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`✓ Contratos de seguridad verificados (${requiredActions.length} Server Actions y SQL RLS).`);
