# Voz y Palabra

Plataforma web para practicar Expresión Oral y Escrita I en CECyT 1, IPN. Incluye acceso de estudiantes, panel docente, portafolio, seguimiento de avance y un canal de atención de incidencias.

## Stack

- Next.js 16.3 con App Router y React 19
- Tailwind CSS 4
- Supabase Auth, Postgres y RLS
- Netlify para despliegue

## Desarrollo local

Requisitos: Node.js compatible con Next.js 16 y npm.

```bash
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

Crea un archivo `.env.local` con estas variables. No compartas sus valores ni los guardes en Git:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

La clave `SUPABASE_SERVICE_ROLE_KEY` solo se usa en componentes y acciones de servidor. Nunca debe exponerse en el navegador.

## Comandos de calidad

```bash
npm run lint
npm run typecheck
npm run test:contracts
npm run build
```

`test:contracts` comprueba invariantes de seguridad en las Server Actions, el esquema y las funciones SQL. El workflow de GitHub también aplica las migraciones de Supabase en un entorno efímero y ejecuta pgTAP.

## Estructura funcional

- `/`: portada pública.
- `/ingreso`: selección de rol y autenticación.
- `/estudiante`: actividades, avance, insignias y portafolio.
- `/docente`: grupos, actividades, estudiantes y seguimiento.
- `/admin`: atención de reportes y seguridad administrativa con MFA.
- `/privacidad`: explicación operativa del uso de datos.

Las rutas protegidas validan la sesión en el servidor. Las tablas expuestas usan RLS y las mutaciones sensibles pasan por funciones o Server Actions autorizadas.

## Supabase

El esquema base está en `supabase/schema.sql` y `supabase/functions.sql`. Las correcciones incrementales viven en `supabase/migrations/` y deben aplicarse en orden. Si se modifica una tabla o función, actualiza también sus políticas, los contratos de seguridad y la documentación de retención de datos.

## Despliegue

Netlify usa `npm run build` y el plugin oficial de Next.js configurado en `netlify.toml`. Define las tres variables de entorno en el sitio de Netlify antes de publicar.

## Datos y privacidad

La ruta `/privacidad` es una explicación para la comunidad; no sustituye el aviso institucional aplicable. Las responsabilidades de conservación, eliminación, atención de solicitudes y supervisión deben quedar definidas por la institución responsable del curso en `docs/politica-datos.md`.
