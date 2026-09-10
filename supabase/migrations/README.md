# Migraciones de Supabase

Las migraciones son el registro ejecutable de los cambios aplicados a producción. `schema.sql` y `functions.sql` forman la reconstrucción canónica actual para una base nueva; no deben depender de que se repita toda la historia de migraciones remotas.

Para una reconstrucción nueva, ejecutar `schema.sql`, después `functions.sql` y finalmente `seed.sql`. El seed conserva los identificadores del catálogo compartido e incluye únicamente los 8 tipos de actividad actualmente implementados, 3 unidades, 31 actividades y 7 insignias; no contiene cuentas, grupos, entregas ni datos personales.

El historial remoto de Supabase y este directorio estuvieron divergentes durante la auditoría. Hasta completar la reconciliación con la CLI enlazada y un respaldo comprobable, no ejecutes `supabase db push` contra producción: prueba cada migración en una rama/proyecto separado y registra cualquier reparación de historial.

La migración `20260906040900_corregir_seguridad_flujos_y_catalogo.sql` conserva el primer acceso estudiantil con los últimos cuatro dígitos de la boleta y el NIP permanente que crea cada estudiante, unifica la confianza en la escala 1–5, protege el alta docente entre la invitación y la confirmación del correo, evita colisiones al crear actividades y alinea los cierres pedagógicos. El código de la aplicación incluido en la misma versión corrige además el retorno de autenticación. Se conserva el catálogo global para todas las docentes y las cuatro categorías de registro; únicamente se corrige el ejemplo que estaba marcado en la categoría equivocada.

La migración `20260816000219_cerrar_hallazgos_seguridad.sql` reconcilia la base existente con esa reconstrucción: cierra policies dirigidas a `public`, asegura índices y funciones/grants vigentes, y elimina el RPC de NIP que ya no tiene callers.

La migración `20260816010000_corregir_contenido_y_privilegios.sql` corrige el contenido publicado de las actividades U1-A8, U1-A9, U2-A1 a U2-A4 y U3-A5; también revoca el acceso directo del Data API a las tablas internas de configuración y límites de intentos.

La lógica vigente permite un intento por actividad y exactamente dos cuando el catálogo incluye una `reintento_alternativo`; el segundo intento usa ese ejercicio diferente. Con 70% o más, el segundo ejercicio es opcional; por debajo de 70%, es obligatorio antes de guardar la reflexión, avanzar o cerrar la unidad. Los niveles son actividades separadas por prerrequisitos y no modifican el número de intentos; si una actividad de nivel también tiene variante, ambas reglas se aplican de forma independiente. La base conserva una sola fila por estudiante y actividad, guarda el mejor puntaje y actualiza el contador de intentos de forma atómica.

La migración `20260816212023_endurecer_sesion_y_insignias.sql` limita el RPC de ingreso a sesiones anónimas y evita otorgar insignias de reflexión o autoconocimiento antes de completar la unidad correspondiente. La corrección `20260816212205_corregir_sesion_insignias.sql` hace explícito el rechazo cuando falta el claim de anonimato y evita contar reflexiones duplicadas de la misma unidad.

La migración `20260816222713_docente_y_limite_ingreso.sql` retira del Data API las columnas internas de autenticación de estudiantes y configura un límite por IP para el RPC de ingreso sin mantener conexiones de Postgres dormidas.

La migración `20260821232542_endurecer_docente_admin_y_ingresos.sql` mueve el pre-request de rate limit al esquema `private`, elimina el RPC público heredado y crea los límites privados de ingreso, invitación y recuperación. El `authenticator` ejecuta esa función sin exponerla al Data API.

La migración `20260904010000_corregir_permisos_pre_request.sql` mueve el punto de entrada del pre-request a un wrapper público controlado, como recomienda PostgREST, conserva las tablas y el helper real sin permisos para clientes, reconoce `x-forwarded-for` al limitar la validación de invitaciones y lee el rol de servicio desde `request.jwt.claims` para la recuperación de contraseña.

La migración `20260904020000_corregir_rate_limit_recuperacion.sql` repite de forma idempotente la función de recuperación para instalaciones que ya tenían aplicada la corrección del pre-request antes del ajuste del claim de servicio.

Antes de desplegar una migración:

1. Comparar el esquema remoto y las migraciones locales.
2. Ejecutar la migración en una base de prueba o rama.
3. Ejecutar los advisors de seguridad y rendimiento.
4. Probar RLS con sesión anónima, estudiante y docente.
5. Aplicarla en una ventana de mantenimiento y comprobar el flujo de ingreso y entrega.

La migración de hardening de este directorio no se ejecuta desde Netlify ni desde la aplicación. La orientación docente se valida en una Server Action y se guarda desde el servidor; la plataforma no necesita acceso de escritura administrativo desde el navegador.

Las migraciones `20260821232633_endurecer_admin_reportes.sql` y `20260821232644_endurecer_observacion_admin.sql` hacen que `public.administradores` sea la fuente de provisión administrativa, exigen MFA TOTP con AAL2 en las policies sensibles, limitan las actualizaciones de `reportes` a estado/prioridad/resolución y registran las atenciones en `public.reporte_eventos`.

La migración `20260822020000_mejorar_atencion_reportes.sql` valida las transiciones de estado también en la base de datos y evita llenar `reporte_eventos` cuando una atención se guarda sin cambios reales.

Las migraciones `20260822030000_un_intento_por_actividad.sql` y `20260822030100_instrucciones_momentos_protegidas.sql` establecieron el límite original de un intento y agregaron instrucciones separadas para presentación, video y resolución. La migración de septiembre de 2026 añade la excepción de dos intentos únicamente para una variante alternativa, sin crear filas adicionales.

La migración `20260823120000_centro_atencion_faq_y_mensajes.sql` separa la respuesta pública de la nota interna, agrega responsables y fechas límite, crea el hilo seguro de mensajes de reportes y centraliza artículos FAQ con métricas de utilidad. Requiere aplicar el snapshot actualizado junto con `schema.sql` y `functions.sql` en una reconstrucción desde cero.

La migración `20260823123000_optimizar_centro_atencion.sql` agrega índices para las nuevas llaves foráneas y separa las policies de lectura y escritura de FAQ para evitar policies permisivas duplicadas.

La migración `20260823164000_endurecer_permisos_centro_atencion.sql` revoca privilegios heredados por defecto en las tablas nuevas y expone solo los RPC y operaciones necesarias para usuarios autenticados.

La migración `20260823170000_habilitar_campos_atencion_reportes.sql` completa el grant de actualización de los campos públicos y operativos que usa el panel administrativo.

La migración `20260823173000_restringir_lectura_interna_reportes.sql` limita la lectura del Data API a los campos públicos/operativos y deja la nota interna y metadatos sensibles únicamente para la consulta administrativa de servidor.

La migración `20260830010000_cerrar_hallazgos_auditoria.sql` distingue las sesiones anónimas de las cuentas docentes permanentes en las escrituras RLS y RPC, filtra la FAQ por audiencia, retira la inserción directa de telemetría, valida la pertenencia de los reportes asociados y limita las interacciones FAQ a 300 por actor y hora. También revoca el acceso directo del cliente al esquema `private`.

La migración `20260830020000_optimizar_policy_faq.sql` conserva el filtro por audiencia y mueve los guards de autenticación de la policy FAQ a initplans para evitar reevaluarlos por cada fila.

La migración `20260830030000_restringir_update_entregas_docente.sql` añade el mismo guard de cuenta docente permanente al único update directo de entregas.

La migración `20260830040000_optimizar_initplan_faq.sql` ajusta la forma del wrapper de `auth.jwt()` para que el advisor de rendimiento reconozca el initplan.

Las migraciones `20260910020000_endurecer_identidad_y_nip.sql`, `20260910020100_unificar_contador_ingreso_estudiante.sql` y `20260910020200_alinear_insignias_con_avance_actual.sql` corrigen, respectivamente, la normalización única de nombres (con abortado seguro ante colisiones), el contador de intentos del ingreso junto con el NIP temporal sin sesgo de módulo y la regla compartida de actividad completada. La primera también retira del Data API el RPC docente heredado sin uso.

La migración `20260821234243_restringir_policies_estudiante.sql` deja las policies directas del estudiante en solo lectura para que no exista un segundo camino de escritura que pueda saltarse las validaciones del servidor. La migración `20260821234838_indexar_auditoria_admin.sql` agrega índices a las llaves foráneas de auditoría para que el historial administrativo escale sin escaneos completos. La migración `20260821234941_optimizar_policies_perfiles_permanentes.sql` conserva el bloqueo de sesiones anónimas y ajusta el uso de `auth.jwt()` al patrón initplan de Postgres.
