# Lista de verificación del recorrido estudiantil

Esta lista acompaña el flujo autodirigido. La retroalimentación de una docente queda fuera de esta fase.

## Recorrido principal

- Ingresar con código, nombre y NIP.
- Ver inicio y la guía de primera ruta.
- Abrir una unidad.
- Definir la meta y la confianza inicial.
- Abrir una actividad disponible.
- Leer la instrucción, el aprendizaje esperado y los pasos.
- Resolver, guardar y volver a abrir la actividad.
- Completar una unidad y escribir la reflexión de cierre.
- Confirmar que el progreso y las insignias se actualicen.

## Compatibilidad manual

- Chrome actual en Android.
- Safari actual en iPhone.
- Firefox actual en computadora.
- Teclado sin mouse: foco visible, botones, enlaces y campos.
- Lector de pantalla: encabezados, estados, progreso y mensajes de error.
- Preferencia de movimiento reducido.
- Cambio a modo sin conexión: mostrar el aviso y no prometer que una respuesta se guardó.
- Actividad de audio: permiso concedido, permiso rechazado, pausa, detención y formato compatible.

## Datos y seguridad

- No colocar códigos, NIP, boletas ni tokens en URLs o capturas.
- Mantener `.env.local` fuera de Git.
- Probar que un estudiante no puede consultar `unidades` ni `actividades` desde el Data API.
- Probar que una entrega no se puede insertar, actualizar o borrar directamente con el cliente del estudiante.
- Probar que cada Server Action rechaza un identificador inválido, una respuesta excesiva y un estado desconocido.
- Revisar periódicamente advisors de Supabase y la política institucional de conservación de datos.
