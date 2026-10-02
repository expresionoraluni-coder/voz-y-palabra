# Observabilidad y respuesta operativa

Esta guía define qué debe vigilarse sin registrar contraseñas, NIP, tokens,
respuestas de estudiantes ni el contenido de reportes.

## Señal mínima

`GET /api/health` se puede consultar desde Netlify Functions, UptimeRobot o el
monitor institucional. Devuelve `200` únicamente cuando las variables de
Supabase existen y una consulta mínima a la base responde. Ante una falla
devuelve `503` sin el mensaje crudo del proveedor y con `Cache-Control: no-store`.

### Estado actual

El repositorio ya incluye `/api/health`, pero actualmente **no hay un monitor
externo conectado ni una alerta automática al correo del administrador**. Las
notificaciones por correo que existen en la aplicación corresponden a reportes
de atención y no sustituyen el monitoreo de disponibilidad o seguridad.

## Qué hace cada servicio

- **Netlify:** publica la aplicación y muestra el resultado de los despliegues y
  los errores de ejecución que registra su plataforma.
- **Supabase:** aloja la base de datos y la autenticación; su panel permite
  revisar eventos, errores y consumo del proyecto según el plan contratado.
- **Monitor HTTP externo:** visita periódicamente `/api/health` desde fuera de
  Netlify. Si recibe varios `503` o no recibe respuesta, envía un correo al
  administrador. Es la opción más sencilla para detectar una caída completa.

Netlify y Supabase no quedan configurados automáticamente como un sistema de
alertas unificado por el código de este repositorio. Para enviar alertas al
administrador hace falta crear la regla en el proveedor elegido y registrar
`digp.inv.ipn@gmail.com` como destinatario.

Ejemplo de comprobación:

```bash
curl -fsS https://voz-y-palabra.netlify.app/api/health
```

## Métricas recomendadas

Configura alertas agregadas (sin datos personales) para:

- porcentaje de respuestas `503` y latencia de `/api/health`;
- errores de inicio de sesión estudiantil, docente y MFA por minuto;
- bloqueos por NIP o código de invitación;
- errores de Server Actions y RPC, agrupados por código técnico;
- fallos de envío de correo y duplicados evitados;
- conflictos de concurrencia al atender reportes;
- crecimiento de `reporte_eventos`, `bitacora` y sesiones anónimas;
- ejecuciones fallidas de respaldo, restauración y pruebas RLS.

Los registros deben conservar únicamente identificadores técnicos no
reversibles, fecha, ruta, código de error y duración. Nunca se deben escribir
NIP, contraseñas, tokens, correos completos, boletas, respuestas ni texto de
reportes.

## Umbrales iniciales

| Señal | Aviso | Acción |
| --- | ---: | --- |
| `/api/health` en 503 | 2 de 5 minutos | revisar Netlify, Supabase y variables de entorno |
| latencia del health check | > 1500 ms durante 5 minutos | revisar región, conexiones y consultas lentas |
| bloqueos de acceso | > 20 por minuto | investigar abuso; no desbloquear manualmente sin verificar |
| errores de correo | > 3 consecutivos | revisar SMTP, cuota y destinatario administrativo |
| conflictos de reportes | > 5 en 10 minutos | revisar concurrencia y comunicar a la administración |

## Respuesta a incidentes

1. Confirmar el alcance con el health check y los logs agregados.
2. No copiar secretos ni datos personales al ticket del incidente.
3. Contener: pausar una función o rotar una credencial únicamente con la
   autorización institucional correspondiente.
4. Conservar timestamps, códigos y cambios recientes; evitar exportar tablas
   completas.
5. Verificar recuperación con `npm run test:contracts`, `npm run build` y las
   pruebas RLS/E2E del entorno efímero.
6. Registrar causa raíz, datos afectados, comunicación y medidas preventivas.

## Configuración pendiente

Para activar la alerta mínima solo faltan cuatro decisiones operativas:

1. dominio público definitivo de la aplicación;
2. proveedor del monitor HTTP;
3. frecuencia de revisión (recomendada: cada 5 minutos);
4. tiempo de conservación de los registros y persona que atiende la alerta.

El destinatario inicial definido por la responsable es
`digp.inv.ipn@gmail.com`. La M. en C. Monserrat Nieto Cuevas queda como
responsable de decidir si una alerta requiere comunicarla al equipo de
investigación o a otra autoridad.
