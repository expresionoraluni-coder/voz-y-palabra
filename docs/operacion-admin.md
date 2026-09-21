# Operación del perfil administrativo

## Alta y MFA

1. Provisiona la cuenta en `public.administradores` usando una operación de confianza y deja `activo = true` únicamente para personas autorizadas.
2. Confirma el correo de la cuenta en Supabase Auth.
3. Durante el alta inicial, configura y verifica un autenticador TOTP desde `/admin/seguridad`.
4. Después de verificar el primer factor, desactiva el alta de nuevos factores TOTP en la configuración de MFA de Supabase Auth. El panel permite administrar los factores ya registrados, pero la decisión de permitir nuevos enrolamientos pertenece al proveedor de identidad y no puede imponerse con RLS.
5. Conserva dos factores verificados en dispositivos distintos. El panel no permite retirar el último factor.

## Atención de reportes

- Las actualizaciones administrativas solo pueden modificar estado, prioridad, respuesta pública, nota interna, responsable y fecha límite.
- La base de datos protege los datos originales, calcula `atendido_en` y `updated_at`, y registra cada atención en `public.reporte_eventos`.
- Si otra sesión actualizó el mismo caso, la interfaz rechaza el guardado y pide recargarlo para evitar sobrescribir trabajo.
- La respuesta pública y la nota interna son opcionales. Puedes marcar un caso como resuelto o cerrarlo sin escribir comentarios; ambos estados se pueden reabrir.
- Trabaja en una cola a la vez: **Nuevos**, **En revisión**, **Esperando respuesta** o **Urgentes**. Elige un caso de la lista y atiéndelo desde el panel de detalle, sin desplegar todos los demás.
- Para solicitar datos, usa **Pedir información**: prepara un texto, cambia el estado a espera y enfoca el mensaje. Para comunicar una actualización sin dejar el caso esperando, escribe el mensaje y envíalo sin cambiar el estado.
- Los mensajes no enviados se conservan durante 24 horas solo en el navegador y la sesión administrativa actual. Usa **Ctrl/Cmd + Enter** para enviar más rápido.

## Sesiones

El panel revoca las sesiones administrativas después de 30 minutos sin actividad. Una recuperación de contraseña o un cierre por inactividad requiere volver a superar el flujo de contraseña y MFA.

## Prueba de carga

`scripts/e2e-carga-2-grupos.mjs` es una herramienta de operación local y no forma parte del flujo normal de la aplicación. Antes de ejecutarla exige confirmar el proyecto objetivo mediante variables de entorno de la terminal:

- `E2E_PROJECT_REF`: referencia del proyecto Supabase que aparece en la URL del proyecto.
- `E2E_CONFIRMATION`: debe ser `VOZ_Y_PALABRA_CARGA_<project-ref>`.
- `E2E_ALLOW_PRODUCTION=1` solo si se cuenta con autorización explícita para probar un proyecto productivo.

Si la referencia no coincide con `NEXT_PUBLIC_SUPABASE_URL`, la simulación se detiene antes de usar la clave de servicio. Los datos creados por la prueba deben conservar su prefijo de simulación y eliminarse al terminar.
