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
const ingresoDocente = await texto("src/app/ingreso/profesora/page.tsx");
const verificarDocente = await texto("src/app/ingreso/profesora/verificar/page.tsx");
const mensajeErrores = await texto("src/lib/mensaje-error.ts");
const cambiarNip = await texto("src/components/cambiar-nip.tsx");
const cambiarNipObligatorio = await texto("src/components/cambiar-nip-obligatorio.tsx");
const migracionEndurecimiento = await texto("supabase/migrations/20260817000801_endurecer_alta_docente_y_nip.sql");
const migracionInvitacion = await texto("supabase/migrations/20260817002812_proteger_registro_docente_con_invitacion.sql");
const accionesEntrega = await texto("src/app/estudiante/actividad/[id]/acciones-entrega.ts");
const contextoEntregas = await texto("src/lib/estudiante-entregas-server.ts");
const videoEmbed = await texto("src/lib/video-embed.ts");
const workflow = await texto(".github/workflows/quality.yml");
const adminLayout = await texto("src/app/admin/layout.tsx");
const adminConstants = await texto("src/lib/admin-constantes.ts");
const reportarProblema = await texto("src/components/reportar-problema.tsx");
const reportesConstantes = await texto("src/lib/reportes-constantes.ts");
const migracionAdmin = await texto("supabase/migrations/20260817010000_separar_administrador_y_reportes.sql");
const proxy = await texto("proxy.ts");
const adminGuard = await texto("src/lib/supabase/requerir-administrador.ts");
const adminAction = await texto("src/app/admin/reportes/acciones-atencion.ts");
const migracionAdminProtegido = await texto("supabase/migrations/20260817012000_proteger_admin_y_reportes.sql");
const migracionMfaAdmin = await texto("supabase/migrations/20260817103542_exigir_mfa_administrador.sql");
const migracionMfaPoliciesAdmin = await texto("supabase/migrations/20260818001000_endurecer_mfa_y_separar_admin.sql");
const adminMfaLogin = await texto("src/app/ingreso/admin/verificar/page.tsx");
const adminMfaSetup = await texto("src/app/admin/seguridad/configurar-mfa.tsx");
const migracionReportesOrientacion = await texto("supabase/migrations/20260817110853_orientacion_y_contexto_en_reportes.sql");
const adminReportesPage = await texto("src/app/admin/reportes/page.tsx");
const actividadEstudiante = await texto("src/app/estudiante/actividad/[id]/page.tsx");
const migracionReportesProtegidos = await texto("supabase/migrations/20260817121500_restringir_alta_reportes.sql");
const migracionContextoReportes = await texto("supabase/migrations/20260817123000_derivar_unidad_en_reportes.sql");
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
if (!verificarDocente.includes("user.is_anonymous === true")) failures.push("verificar docente: debe rechazar sesiones anónimas.");
if (mensajeErrores.includes("Este correo ya tiene una cuenta")) failures.push("auth docente: no debe enumerar correos registrados.");
if (cambiarNip.includes("setError(rpcError.message)") || cambiarNipObligatorio.includes("setError(rpcError.message)")) {
  failures.push("NIP: no debe mostrar mensajes crudos del proveedor.");
}
if (!functions.includes("crear_perfil_docente") || !functions.includes("email_confirmed_at") || !functions.includes("Se requiere una cuenta docente confirmada.")) {
  failures.push("functions: el alta docente debe exigir cuenta permanente y correo confirmado.");
}
if (!functions.includes("v_path not like '%/rpc/crear_perfil_docente'") || !migracionEndurecimiento.includes("crear_perfil_docente")) {
  failures.push("rate limit: falta cubrir el RPC de alta docente en la función y su migración.");
}
if (!ingresoDocente.includes("codigo_invitacion_docente") || !ingresoDocente.includes("codigoListo")) {
  failures.push("alta docente: el código debe comprobarse antes de registrar la cuenta.");
}
if (!ingresoDocente.includes("12 caracteres como mínimo") || !ingresoDocente.includes("contrasenaValida")) {
  failures.push("alta docente: la contraseña debe mostrar y validar sus requisitos en español.");
}
if (!functions.includes("validar_invitacion_alta_docente") || !migracionInvitacion.includes("before insert on auth.users")) {
  failures.push("Supabase: falta el control transaccional de invitación antes de crear la cuenta.");
}
if (ingresoDocente.includes("piloto") || verificarDocente.includes("piloto")) {
  failures.push("alta docente: no debe mostrar la palabra piloto.");
}
if (!functions.includes("where auth_user_id = auth.uid() and activo = true") || !functions.includes("Este cambio requiere una sesión de estudiante.")) {
  failures.push("NIP: el cambio debe exigir sesión anónima y estudiante activo.");
}
if (!functions.includes("v_estudiante.debe_cambiar_nip") || !functions.includes("v_estudiante.auth_user_id is not null")) {
  failures.push("NIP: el primer vínculo debe evitar que otra sesión reclame un estudiante pendiente.");
}
if (!schema.includes('solo perfiles docentes permanentes usan unidades') || !schema.includes('solo perfiles docentes permanentes usan actividades')) {
  failures.push("schema: unidades y actividades deben excluir explícitamente sesiones anónimas.");
}

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
if (!schema.includes("create table administradores") || !schema.includes("create table reportes")) {
  failures.push("admin: schema.sql debe reconstruir las tablas administrativas y de reportes.");
}
if (!migracionAdmin.includes('create policy "administrador atiende reportes"') || !migracionAdmin.includes('create policy "estudiante o docente crea su reporte"')) {
  failures.push("admin: la migración debe separar la atención administrativa de la creación de reportes.");
}
if (!adminLayout.includes("requerirAdministrador") || !adminLayout.includes("administrador")) {
  failures.push("admin: las rutas administrativas deben validar el perfil antes de renderizar.");
}
if (!adminConstants.includes('digp.inv.ipn@gmail.com') || !adminGuard.includes("email_confirmed_at") || !adminGuard.includes("administrador?.activo")) {
  failures.push("admin: el guard debe exigir la cuenta permanente, correo confirmado y perfil activo.");
}
if (!adminAction.includes('"use server"') || !adminAction.includes("obtenerAdministrador") || !adminAction.includes("revalidatePath")) {
  failures.push("admin: la atención de reportes debe ejecutarse en una Server Action protegida.");
}
if (!migracionAdminProtegido.includes("es_administrador_activo") || !migracionAdminProtegido.includes("proteger_reporte_atencion")) {
  failures.push("admin: Supabase debe verificar la cuenta permanente y proteger los datos originales del reporte.");
}
if (!proxy.includes("createServerClient") || !proxy.includes("supabase.auth.getUser()") || !proxy.includes('"/admin/:path*"')) {
  failures.push("sesión SSR: falta renovar la sesión de Supabase antes de renderizar rutas protegidas.");
}
if (!reportarProblema.includes('.rpc("registrar_reporte"') || reportarProblema.includes("nip:") || reportarProblema.includes("password:")) {
  failures.push("reportes: el botón debe registrar casos sin transportar NIP ni contraseña.");
}
if (!reportarProblema.includes("Mis solicitudes") || !reportarProblema.includes("contextoDeRuta") || !reportarProblema.includes("bottom-24")) {
  failures.push("reportes: el flujo debe ofrecer seguimiento propio, contexto de ruta y espacio para la navegación inferior del estudiante.");
}
if (!reportarProblema.includes("AYUDAS_ESTUDIANTE") || !reportarProblema.includes("AYUDAS_DOCENTE")) {
  failures.push("reportes: las dudas frecuentes deben recibir orientación rápida antes de generar un caso.");
}
if (reportarProblema.includes("Ayuda y reportes") || !reportarProblema.includes(">Ayuda</h2>")) {
  failures.push("ayuda: el acceso visible debe llamarse solo Ayuda.");
}
if (!reportesConstantes.includes("CATEGORIAS_REPORTE_ESTUDIANTE") || !reportesConstantes.includes("CATEGORIAS_REPORTE_DOCENTE")) {
  failures.push("reportes: deben existir listas separadas de categorías para estudiantes y docentes.");
}
if (!functions.includes("estudiante_instruccion") || !functions.includes("docente_estudiantes") || !functions.includes("La categoría no corresponde a una solicitud de estudiante.") || !functions.includes("La categoría no corresponde a una solicitud de docente.") || !schema.includes("docente_seguimiento")) {
  failures.push("Supabase: schema.sql y functions.sql deben aceptar las categorías específicas por rol.");
}
if (adminReportesPage.includes('from("reportes").select("*")')) {
  failures.push("admin: la bandeja de reportes no debe traer columnas innecesarias.");
}
if (!migracionReportesOrientacion.includes("reportes_categoria_check") || !migracionReportesOrientacion.includes("p_unidad_id") || !migracionReportesOrientacion.includes("p_actividad_id") || !migracionReportesOrientacion.includes("p_categoria = 'orientacion'")) {
  failures.push("Supabase: la migración de reportes debe validar contexto y conservar la orientación automática.");
}
if (!schema.includes("revoke all on public.reportes from public, anon, authenticated") || !functions.includes("grant select, update on public.reportes to authenticated") || !migracionReportesProtegidos.includes("revoke insert on public.reportes from authenticated")) {
  failures.push("reportes: la creación debe quedar exclusivamente detrás del RPC validado.");
}
if (!schema.includes('drop policy if exists "estudiante o docente crea su reporte"') || !migracionReportesProtegidos.includes('drop policy if exists "estudiante o docente crea su reporte"')) {
  failures.push("reportes: no debe permanecer una policy de inserción directa como ruta heredada.");
}
if (!actividadEstudiante.includes("ReportarProblema") || !actividadEstudiante.includes("navegacionInferior={false}")) {
  failures.push("reportes: el estudiante debe poder solicitar ayuda dentro de una actividad.");
}
if (!migracionContextoReportes.includes("v_unidad_id") || !migracionContextoReportes.includes("jsonb_set")) {
  failures.push("reportes: la actividad debe completar la unidad en el contexto guardado.");
}
if (!adminGuard.includes("listFactors") || !adminGuard.includes("getAuthenticatorAssuranceLevel") || !adminGuard.includes("/ingreso/admin/verificar")) {
  failures.push("admin: el guard server-side debe comprobar MFA y redirigir a su verificación.");
}
if (!adminMfaLogin.includes("challengeAndVerify") || !adminMfaLogin.includes("one-time-code") || !adminMfaLogin.includes("ADMINISTRADOR_EMAIL")) {
  failures.push("admin: falta el flujo de verificación TOTP en el ingreso.");
}
if (!adminMfaSetup.includes("mfa.enroll") || !adminMfaSetup.includes("challengeAndVerify") || !adminMfaSetup.includes("factorType: \"totp\"")) {
  failures.push("admin: falta la configuración TOTP dentro del panel de seguridad.");
}
if (!migracionMfaAdmin.includes("auth.mfa_factors") || !migracionMfaAdmin.includes("aal2") || !migracionMfaAdmin.includes("es_administrador_activo")) {
  failures.push("Supabase: las policies administrativas deben exigir AAL2 cuando existe un factor verificado.");
}
if (!schema.includes("auth.mfa_factors") || !functions.includes("auth.mfa_factors") || !functions.includes("factor.factor_type = 'totp'") || !functions.includes("and coalesce((select auth.jwt()->>'aal'), 'aal1') = 'aal2'") || !migracionMfaPoliciesAdmin.includes("and exists") || !migracionMfaPoliciesAdmin.includes("factor.factor_type = 'totp'") || !migracionMfaPoliciesAdmin.includes("grant execute on function public.es_administrador_activo() to authenticated")) {
  failures.push("Supabase: schema.sql, functions.sql y la migración final deben exigir MFA AAL2 al administrador.");
}
if (!functions.includes("Esta cuenta tiene acceso administrativo y no se puede registrar como docente.") || !migracionMfaPoliciesAdmin.includes("Esta cuenta tiene acceso administrativo y no se puede registrar como docente.")) {
  failures.push("Supabase: la cuenta administrativa no debe poder registrarse también como docente.");
}
if (!workflow.includes("cp ../supabase/migrations/*.sql supabase/migrations/") || !workflow.includes("version: 2.101.0")) {
  failures.push("CI: debe aplicar las migraciones versionadas y fijar la versiÃ³n de Supabase CLI.");
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `✗ ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`✓ Contratos de seguridad verificados (${requiredActions.length} Server Actions y SQL RLS).`);
