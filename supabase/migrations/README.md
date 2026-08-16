# Migraciones de Supabase

Las migraciones son el registro ejecutable de los cambios aplicados a producción. `schema.sql` y `functions.sql` forman la reconstrucción canónica actual para una base nueva; no deben depender de que se repita toda la historia de migraciones remotas.

La migración `20260816000219_cerrar_hallazgos_seguridad.sql` reconcilia la base existente con esa reconstrucción: cierra policies dirigidas a `public`, asegura índices y funciones/grants vigentes, y elimina el RPC de NIP que ya no tiene callers.

La migración `20260816010000_corregir_contenido_y_privilegios.sql` corrige el contenido publicado de las actividades U1-A8, U1-A9, U2-A1 a U2-A4 y U3-A5; también revoca el acceso directo del Data API a las tablas internas de configuración y límites de intentos.

La migración `20260816011000_alinear_insignias_con_avance.sql` hace que las insignias usen la misma regla de avance que la interfaz: 70 puntos o tres intentos para actividades automáticas.

La migración `20260816212023_endurecer_sesion_y_insignias.sql` limita el RPC de ingreso a sesiones anónimas y evita otorgar insignias de reflexión o autoconocimiento antes de completar la unidad correspondiente. La corrección `20260816212205_corregir_sesion_insignias.sql` hace explícito el rechazo cuando falta el claim de anonimato y evita contar reflexiones duplicadas de la misma unidad.

La migración `20260816222713_docente_y_limite_ingreso.sql` retira del Data API las columnas internas de autenticación de estudiantes y configura un límite por IP para el RPC de ingreso sin mantener conexiones de Postgres dormidas.

Antes de desplegar una migración:

1. Comparar el esquema remoto y las migraciones locales.
2. Ejecutar la migración en una base de prueba o rama.
3. Ejecutar los advisors de seguridad y rendimiento.
4. Probar RLS con sesión anónima, estudiante y docente.
5. Aplicarla en una ventana de mantenimiento y comprobar el flujo de ingreso y entrega.

La migración de hardening de este directorio no se ejecuta desde Netlify ni desde la aplicación. La orientación docente se valida en una Server Action y se guarda desde el servidor; la plataforma no necesita acceso de escritura administrativo desde el navegador.
