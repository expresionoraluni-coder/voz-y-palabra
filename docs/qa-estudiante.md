# Lista de verificación del recorrido estudiantil

Esta lista acompaña el flujo autodirigido. La orientación de una docente es opcional y nunca bloquea el avance.

## Recorrido principal

- Ingresar con código, nombre y NIP.
- Ver inicio y la guía de primera ruta.
- Abrir una unidad.
- Definir la meta y la confianza inicial.
- Abrir una actividad disponible.
- Leer la instrucción, el aprendizaje esperado y los pasos.
- Abrir “¿Te atoraste? Ver una pista” solo si hace falta y comprobar que orienta sin mostrar la respuesta.
- Resolver, guardar y volver a abrir la actividad.
- Confirmar que cada actividad solo permite un envío; después del envío se muestran el resultado y la reflexión, sin botón de reintento.
- En una actividad de dos niveles, comprobar que el nivel 2 permanece bloqueado hasta concluir el nivel 1 y guardar su reflexión.
- Completar todas las actividades de una unidad, guardar la reflexión de la última actividad, la reflexión de cierre y la confianza final.
- Confirmar que la unidad siguiente permanece bloqueada hasta terminar todos esos pasos.
- Confirmar que el progreso y las insignias se actualicen.

## Compatibilidad manual

- Chrome actual en Android.
- Safari actual en iPhone.
- Firefox actual en computadora.
- Teclado sin mouse: foco visible, botones, enlaces y campos.
- Lector de pantalla: encabezados, estados, progreso y mensajes de error.
- Preferencia de movimiento reducido.
- Cambio a modo sin conexión: mostrar el aviso y no prometer que una respuesta se guardó.

## Datos y seguridad

- No colocar códigos, NIP, boletas ni tokens en URLs o capturas.
- Mantener `.env.local` fuera de Git.
- Probar que un estudiante no puede consultar `unidades` ni `actividades` desde el Data API.
- Probar que una entrega no se puede insertar, actualizar o borrar directamente con el cliente del estudiante.
- Probar que cada Server Action rechaza un identificador inválido, una respuesta excesiva y un estado desconocido.
- Revisar periódicamente advisors de Supabase y la política institucional de conservación de datos.
