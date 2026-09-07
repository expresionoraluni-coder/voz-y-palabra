# Lista de verificación del recorrido estudiantil

Esta lista acompaña el flujo autodirigido. La orientación de una docente es opcional y nunca bloquea el avance.

## Recorrido principal

- Ingresar con código de grupo, nombre y código de activación en el primer acceso; después, usar el NIP personal de cuatro dígitos.
- Ver inicio y la guía de primera ruta.
- Abrir una unidad.
- Definir la meta y la confianza inicial.
- Abrir una actividad disponible.
- Leer la instrucción, el aprendizaje esperado y los pasos.
- Abrir “¿Te atoraste? Ver una pista” solo si hace falta y comprobar que orienta sin mostrar la respuesta.
- Resolver, guardar y volver a abrir la actividad.
- Confirmar que una actividad sin variante permite un solo intento.
- Confirmar que una actividad con `reintento_alternativo` permite exactamente dos intentos y muestra un ejercicio diferente en el segundo.
- Con un resultado de 70% o más, confirmar que el segundo ejercicio es opcional; con menos de 70%, comprobar que la reflexión, el siguiente paso y el cierre permanecen bloqueados hasta resolverlo.
- En una actividad de comparación de videos, comprobar que ambos videos abren y que no aparece una evaluación respondible si falta alguno.
- En una secuencia de dos niveles, comprobar que el nivel 2 es otra actividad y permanece bloqueado hasta guardar la entrega y la reflexión del nivel 1. Los niveles no cambian el número de intentos.
- Si una actividad de nivel 1 o nivel 2 también tiene `reintento_alternativo`, comprobar que el reintento se controla por separado: el nivel desbloquea la siguiente actividad y la variante controla el segundo ejercicio.
- Después de cada entrega, guardar obligatoriamente la reflexión y comprobar que la siguiente actividad continúa bloqueada hasta hacerlo.
- Completar todas las actividades y sus reflexiones; después, guardar la reflexión de cierre de la unidad y registrar la confianza final.
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
