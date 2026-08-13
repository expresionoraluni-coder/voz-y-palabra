# Migraciones de Supabase

Las migraciones son el registro ejecutable de la base de datos. `schema.sql` conserva las tablas, RLS y semillas para una base nueva; `functions.sql` contiene las funciones de Auth y negocio necesarias para completar la reconstrucción. Este directorio conserva los cambios incrementales que deben revisarse antes de aplicarse.

Antes de desplegar una migración:

1. Comparar el esquema remoto y las migraciones locales.
2. Ejecutar la migración en una base de prueba o rama.
3. Ejecutar los advisors de seguridad y rendimiento.
4. Probar RLS con sesión anónima, estudiante y docente.
5. Aplicarla en una ventana de mantenimiento y comprobar el flujo de ingreso y entrega.

La migración de hardening de este directorio no se ejecuta desde Netlify ni desde la aplicación. La orientación docente se valida en una Server Action y se guarda desde el servidor; la plataforma no necesita acceso de escritura administrativo desde el navegador.
