# Entornos y despliegue

La base de datos productiva no debe usarse para desarrollo, pruebas de carga ni reconstrucciones del catálogo. El entorno local debe apuntar a un proyecto o rama de Supabase independiente; las credenciales de producción solo se configuran en Netlify.

## Cambios de base de datos

1. Revisa primero el historial enlazado en el panel/CLI de Supabase y confirma que el repositorio y producción estén reconciliados.
2. Prueba la migración en una rama o proyecto vacío reconstruido con `schema.sql`, `functions.sql` y `seed.sql`.
3. Verifica contratos y pgTAP antes de solicitar su aplicación en producción.
4. Haz un respaldo comprobable y aplica una migración versionada durante una ventana acordada.

No ejecutes `supabase db push` desde este repositorio contra producción mientras el historial de `supabase/migrations/` siga divergente.

## Prueba de carga

`scripts/e2e-carga-2-grupos.mjs` exige `E2E_PROJECT_REF`, una confirmación exacta y, para producción, `E2E_ALLOW_PRODUCTION=1`. La recomendación operativa es usar siempre un proyecto de prueba.

## Limpieza de sesiones anónimas

`scripts/limpiar-usuarios-anonimos.mjs` funciona en simulación por defecto. Solo considera usuarios anónimos con al menos siete días de inactividad y sin referencias en estudiantes, reportes ni interacciones de ayuda. Primero ejecuta:

```bash
node scripts/limpiar-usuarios-anonimos.mjs
```

La eliminación requiere una confirmación separada (`--apply`, `ANON_CLEANUP_CONFIRM=VOZ_Y_PALABRA_LIMPIAR_ANONIMOS`) y una autorización adicional si el destino es producción. No se ejecuta automáticamente.
