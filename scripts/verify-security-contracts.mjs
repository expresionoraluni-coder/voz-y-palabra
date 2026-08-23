import { readFile } from "node:fs/promises";
import { glob } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const requiredActions = [
  "src/app/estudiante/actividad/[id]/acciones-entrega.ts",
  "src/app/estudiante/actividad/[id]/acciones-calificacion.ts",
  "src/app/docente/estudiantes/[id]/acciones-apoyo.ts",
  "src/app/docente/grupos/[id]/acciones-estudiantes.ts",
  "src/app/ingreso/recuperar/acciones.ts",
  "src/app/estudiante/acciones-reflexiones.ts",
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
const migracionEntregasReportes = await texto("supabase/migrations/20260821232601_proteger_entregas_y_reportes.sql");
const migracionInvitacion = await texto("supabase/migrations/20260817002812_proteger_registro_docente_con_invitacion.sql");
const accionesEntrega = await texto("src/app/estudiante/actividad/[id]/acciones-entrega.ts");
const contextoEntregas = await texto("src/lib/estudiante-entregas-server.ts");
const accionesAprendizaje = await texto("src/app/estudiante/acciones-reflexiones.ts");
const progresoUnidad = await texto("src/lib/progreso-unidad.ts");
const migracionIntentoUnico = await texto("supabase/migrations/20260822030000_un_intento_por_actividad.sql");
const migracionPoliciesRedundantes = await texto("supabase/migrations/20260822110537_eliminar_policies_redundantes_contenido.sql");
const migracionPoliciesCatalogo = await texto("supabase/migrations/20260822110639_normalizar_policies_catalogo.sql");
const migracionPolicyEntregas = await texto("supabase/migrations/20260822110903_unificar_policy_update_entregas.sql");
const migracionIngresoAnonimo = await texto("supabase/migrations/20260822114546_restringir_rpc_ingreso_estudiante_anonimo.sql");
const migracionPerfilDocente = await texto("supabase/migrations/20260822114552_unificar_select_perfil_docente.sql");
const migracionLecturasOperativas = await texto("supabase/migrations/20260822114557_unificar_select_lecturas_operativas.sql");
const migracionBitacoraRetro = await texto("supabase/migrations/20260822114604_unificar_lecturas_bitacora_retroalimentacion.sql");
const migracionContenido = await texto("supabase/migrations/20260822114650_separar_escrituras_contenido.sql");
const migracionOperativas = await texto("supabase/migrations/20260822114657_separar_escrituras_operativas.sql");
const videoEmbed = await texto("src/lib/video-embed.ts");
const workflow = await texto(".github/workflows/quality.yml");
const adminLayout = await texto("src/app/admin/layout.tsx");
const reportarProblema = await texto("src/components/reportar-problema.tsx");
const reportesConstantes = await texto("src/lib/reportes-constantes.ts");
const migracionAdmin = await texto("supabase/migrations/20260817010000_separar_administrador_y_reportes.sql");
const proxy = await texto("proxy.ts");
const adminGuard = await texto("src/lib/supabase/requerir-administrador.ts");
const adminAction = await texto("src/app/admin/reportes/acciones-atencion.ts");
const migracionAdminProtegido = await texto("supabase/migrations/20260817012000_proteger_admin_y_reportes.sql");
const migracionMfaAdmin = await texto("supabase/migrations/20260817103542_exigir_mfa_administrador.sql");
const migracionMfaPoliciesAdmin = await texto("supabase/migrations/20260818001000_endurecer_mfa_y_separar_admin.sql");
const migracionAdminAuditoria = await texto("supabase/migrations/20260821232633_endurecer_admin_reportes.sql");
const adminMfaLogin = await texto("src/app/ingreso/admin/verificar/page.tsx");
const adminMfaSetup = await texto("src/app/admin/seguridad/configurar-mfa.tsx");
const adminEntryActions = await texto("src/app/ingreso/admin/acciones.ts");
const migracionReportesOrientacion = await texto("supabase/migrations/20260817110853_orientacion_y_contexto_en_reportes.sql");
const adminReportesPage = await texto("src/app/admin/reportes/page.tsx");
const actividadEstudiante = await texto("src/app/estudiante/actividad/[id]/page.tsx");
const migracionReportesProtegidos = await texto("supabase/migrations/20260817121500_restringir_alta_reportes.sql");
const migracionContextoReportes = await texto("supabase/migrations/20260817123000_derivar_unidad_en_reportes.sql");
const recuperacion = await texto("src/app/ingreso/recuperar/page.tsx");
const accionesRecuperacion = await texto("src/app/ingreso/recuperar/acciones.ts");
const actualizarContrasena = await texto("src/app/ingreso/recuperar/actualizar/page.tsx");
const reglasContrasena = await texto("src/lib/validar-contrasena.ts");
const controlSesionAdmin = await texto("src/app/admin/control-sesion-admin.tsx");
const adminDashboard = await texto("src/app/admin/page.tsx");
const bandejaReportes = await texto("src/app/admin/reportes/bandeja-reportes.tsx");
const reporteAtencion = await texto("src/app/admin/reportes/reporte-atencion.tsx");
const accionesCalificacion = await texto("src/app/estudiante/actividad/[id]/acciones-calificacion.ts");
const cargaE2e = await texto("scripts/e2e-carga-2-grupos.mjs");
const netlify = await texto("netlify.toml");
const packageJson = await texto("package.json");
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
if (!accionesRecuperacion.includes("esContrasenaValida") || !accionesRecuperacion.includes("auth.updateUser")) {
  failures.push("recuperación: la contraseña debe validarse y actualizarse también en servidor.");
}
if (!accionesRecuperacion.includes("voz-y-palabra.netlify.app") || !accionesRecuperacion.includes("permitidos.has(origen)")) {
  failures.push("recuperación: el redirect debe usar un origen permitido, no cualquier Origin del navegador.");
}
if (!functions.includes("proteger_cuota_reportes") || !schema.includes("proteger_cuota_reportes") || !migracionEntregasReportes.includes("proteger_cuota_reportes")) {
  failures.push("reportes: debe existir una cuota diaria protegida por trigger y respaldada en SQL.");
}
if (!reglasContrasena.includes("12 caracteres como mínimo") || !ingresoDocente.includes("contrasenaValida")) {
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
if (schema.includes('solo perfiles docentes permanentes usan unidades') || schema.includes('solo perfiles docentes permanentes usan actividades')) {
  failures.push("schema: no debe reconstruir policies restrictivas redundantes para unidades y actividades.");
}
if (!migracionPoliciesRedundantes.includes('drop policy if exists "solo perfiles docentes permanentes usan unidades"') || !migracionPoliciesRedundantes.includes('drop policy if exists "solo perfiles docentes permanentes usan actividades"')) {
  failures.push("Supabase: falta retirar las policies FOR ALL redundantes de contenido.");
}
if (!migracionPoliciesCatalogo.includes("auth.uid()") || migracionPoliciesCatalogo.includes("auth.role()")) {
  failures.push("Supabase: las policies del catálogo no deben usar auth.role().");
}
if (!migracionPolicyEntregas.includes('docente actualiza entregas de sus grupos') || !migracionPolicyEntregas.includes('with check')) {
  failures.push("Supabase: las actualizaciones de entregas deben quedar en una sola policy con WITH CHECK.");
}
if (!migracionIngresoAnonimo.includes("revoke execute on function public.ingresar_estudiante(text, text, text) from anon") || !migracionIngresoAnonimo.includes("begin;") || !migracionIngresoAnonimo.includes("commit;")) {
  failures.push("Supabase: el RPC de ingreso estudiantil no debe quedar ejecutable por anon.");
}
if (!migracionPerfilDocente.includes('docente o administrador ve perfiles docentes') || migracionPerfilDocente.includes('create policy "docente ve su propio perfil"') || migracionPerfilDocente.includes('create policy "administrador observa docentes"')) {
  failures.push("Supabase: el SELECT de perfiles docentes debe quedar en una sola policy.");
}
if (!migracionLecturasOperativas.includes('estudiante, docente o administrador lee entregas') || !migracionLecturasOperativas.includes('estudiante, docente o administrador lee reflexiones') || !migracionLecturasOperativas.includes('estudiante, docente o administrador lee confianza') || !migracionLecturasOperativas.includes('estudiante, docente o administrador lee insignias otorgadas')) {
  failures.push("Supabase: las lecturas operativas deben conservar una policy SELECT por tabla.");
}
if (!migracionBitacoraRetro.includes('estudiante, docente o administrador lee bitácora') || !migracionBitacoraRetro.includes('estudiante, docente o administrador lee retroalimentación') || !migracionBitacoraRetro.includes('for insert') || !migracionBitacoraRetro.includes('for update') || !migracionBitacoraRetro.includes('for delete')) {
  failures.push("Supabase: bitácora y retroalimentación deben conservar lectura unificada y escrituras docentes separadas.");
}
if (!migracionContenido.includes('docente o administrador lee unidades') || !migracionContenido.includes('docente o administrador lee actividades') || !migracionContenido.includes('docente crea unidades') || !migracionContenido.includes('docente actualiza actividades')) {
  failures.push("Supabase: unidades y actividades deben separar lectura administrativa de escrituras docentes.");
}
if (!migracionOperativas.includes('estudiante, docente o administrador lee avisos') || !migracionOperativas.includes('estudiante, docente o administrador lee eventos') || !migracionOperativas.includes('estudiante, docente o administrador lee grupos') || !migracionOperativas.includes('docente o estudiante lee estudiantes permitidos')) {
  failures.push("Supabase: avisos, eventos, grupos y estudiantes deben separar lectura y escritura.");
}

if (!contextoEntregas.includes("validarAccesoActividad")) failures.push("entregas: falta el guard server-side de prerrequisitos.");
if (!accionesEntrega.includes("validarEntregaAbiertaPorTipo")) failures.push("entregas: faltan validaciones server-side por tipo.");
if (!contextoEntregas.includes('rpc("guardar_entrega_auto"') || !migracionIntentoUnico.includes("Ya registraste el único intento de esta actividad.") || !migracionIntentoUnico.includes("v_intentos_previos >= 1")) {
  failures.push("entregas: falta el límite atómico de un intento.");
}
if ((functions.match(/create or replace function public\.guardar_entrega_auto/g) ?? []).length !== 1) {
  failures.push("functions: guardar_entrega_auto debe tener una sola definición canónica.");
}
if (!schema.includes("where actividad_id is null") || !accionesAprendizaje.includes("unidad_id: null")) {
  failures.push("reflexiones: falta separar las filas de actividad del cierre de unidad.");
}
if (accionesAprendizaje.includes(".upsert(") || !accionesAprendizaje.includes("debe_cambiar_nip") || !functions.includes("revoke all on public.reflexiones")) {
  failures.push("aprendizaje: las escrituras del estudiante deben ser acciones protegidas e inmutables.");
}
if (!progresoUnidad.includes("return true;") || !progresoUnidad.includes('"unidad_anterior_confianza"')) {
  failures.push("avance: una entrega debe concluir la actividad y el cierre de unidad debe incluir confianza final.");
}
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
if (!adminGuard.includes("email_confirmed_at") || !adminGuard.includes("administrador?.activo") || !adminEntryActions.includes("administradores")) {
  failures.push("admin: el guard y el ingreso deben exigir correo confirmado y perfil administrativo activo.");
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
if (!schema.includes("revoke all on public.reportes from public, anon, authenticated") || !functions.includes("grant select (id, reportante_id, reportante_tipo, categoria, descripcion, estado, prioridad, grupo_id, unidad_id, actividad_id, ruta, contexto, respuesta_publica, created_at, updated_at) on public.reportes to authenticated") || !functions.includes("grant update (estado, prioridad, resolucion, respuesta_publica, asignado_a, fecha_limite) on public.reportes to authenticated") || !migracionReportesProtegidos.includes("revoke insert on public.reportes from authenticated")) {
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
if (!adminMfaLogin.includes("challengeAndVerify") || !adminMfaLogin.includes("one-time-code") || !adminMfaLogin.includes("comprobarAdministradorProvisionado")) {
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
if (!ingresoDocente.includes("/ingreso/recuperar") || !accionesRecuperacion.includes("resetPasswordForEmail") || !recuperacion.includes("No se informa si el correo existe")) {
  failures.push("recuperación: debe existir un restablecimiento por correo sin enumerar cuentas.");
}
if (!actualizarContrasena.includes("exchangeCodeForSession") || !actualizarContrasena.includes("PASSWORD_RECOVERY") || (!actualizarContrasena.includes("updateUser({ password") && !accionesRecuperacion.includes("updateUser({ password")) || !actualizarContrasena.includes('signOut({ scope: "global" })')) {
  failures.push("recuperación: el enlace debe intercambiarse, actualizar la contraseña y revocar las sesiones.");
}
if (!reglasContrasena.includes("12 caracteres como mínimo") || !reglasContrasena.includes("esContrasenaValida")) {
  failures.push("contraseña: los requisitos deben estar centralizados y reutilizables.");
}
if (!controlSesionAdmin.includes("30 * 60 * 1000") || !controlSesionAdmin.includes('signOut({ scope: "global" })')) {
  failures.push("admin: debe revocar las sesiones tras un periodo de inactividad.");
}
if (!proxy.includes('"private, no-store, max-age=0"') || !proxy.includes('"/ingreso/recuperar/:path*"')) {
  failures.push("admin: las pantallas sensibles deben enviar Cache-Control no-store.");
}
if (!adminDashboard.includes('select("id", { count: "exact", head: true })') || !adminDashboard.includes("reportes24hCount")) {
  failures.push("admin: el resumen debe usar conteos ligeros y mostrar actividad reciente.");
}
if (!adminReportesPage.includes("clausulasBusqueda") || !bandejaReportes.includes("limpiarFiltros")) {
  failures.push("admin: la bandeja debe buscar en servidor y permitir limpiar filtros.");
}
if (!reporteAtencion.includes("SUGERENCIAS_ATENCION") || !reporteAtencion.includes("no una resolución automática")) {
  failures.push("admin: la atención debe ofrecer una guía contextual sin resolver casos automáticamente.");
}
if (!adminAction.includes("actualizadoEn") || !adminAction.includes("updated_at") || !adminAction.includes("maybeSingle") || !reporteAtencion.includes("actualizadoEn")) {
  failures.push("admin: la atención debe detectar conflictos de concurrencia antes de sobrescribir un reporte.");
}
if (!schema.includes("create table reporte_eventos") || !functions.includes("registrar_evento_reporte_atencion") || !migracionAdminAuditoria.includes("revoke update on public.reportes from authenticated")) {
  failures.push("admin: la atención debe conservar un historial y restringir las columnas actualizables.");
}
if (!adminMfaSetup.includes("mfa.unenroll") || !adminMfaSetup.includes("unverified")) {
  failures.push("admin: la gestión MFA debe limpiar configuraciones pendientes y permitir retirar solo factores secundarios.");
}
if (!workflow.includes("cp ../supabase/migrations/*.sql supabase/migrations/") || !workflow.includes("version: 2.101.0")) {
  failures.push("CI: debe aplicar las migraciones versionadas y fijar la versiÃ³n de Supabase CLI.");
}
if (!functions.includes("grant usage on schema private to authenticator") || !schema.includes("grant usage on schema private to authenticator")) {
  failures.push("Supabase: authenticator necesita uso explícito del esquema private para el pre-request.");
}
if (!functions.includes("before insert or update on public.entregas") || !functions.includes("tg_op = 'INSERT'") || !functions.includes("sanitizar_respuesta_entrega(p_respuesta - '_meta')")) {
  failures.push("Supabase: las respuestas deben sanitizarse tanto al insertar como al actualizar entregas.");
}
if (schema.includes('create policy "administrador observa estudiantes"')) {
  failures.push("Supabase: el administrador no debe tener una policy directa para leer estudiantes y boletas.");
}
if (!accionesCalificacion.includes("elegidas.length !== contenido.elementos.length") || !accionesCalificacion.includes("elegidas.length !== contenido.fragmentos.length")) {
  failures.push("calificación: el servidor debe validar que se respondió cada elemento.");
}
if (!cargaE2e.includes("E2E_PROJECT_REF") || !cargaE2e.includes("E2E_CONFIRMATION") || !cargaE2e.includes("E2E_ALLOW_PRODUCTION")) {
  failures.push("carga E2E: falta confirmar el proyecto objetivo y bloquear producción por defecto.");
}
if (!netlify.includes('NODE_VERSION = "22"') || !packageJson.includes('"eslint-config-next": "16.3.0"')) {
  failures.push("despliegue: falta fijar Node y alinear eslint-config-next con Next.");
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `✗ ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`✓ Contratos de seguridad verificados (${requiredActions.length} Server Actions y SQL RLS).`);
