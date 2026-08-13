# QA del recorrido docente

Esta lista valida que la docente pueda preparar y monitorear el curso con pocas decisiones y sin depender de la retroalimentación individual.

## Recorrido principal

1. Iniciar sesión como docente.
2. Ver en el panel la siguiente acción recomendada y el resumen de grupos, estudiantes y actividades.
3. Crear o abrir un grupo.
4. Agregar estudiantes y confirmar que la alerta o el avance lleva al perfil correcto.
5. Abrir una unidad y reconocer el objetivo de la unidad y el nombre comprensible de cada tipo de actividad.
6. Crear o editar una actividad siguiendo la ruta rápida: dinámica, instrucción y contenido.
7. Abrir un caso de apoyo y comprobar que la interfaz explica que no es una calificación.
8. Añadir una orientación opcional, marcar el caso como atendido y comprobar que aparece para el estudiante.
9. Cerrar o recuperar la conexión y comprobar que se avisa antes de guardar cambios.
10. En la lista de estudiantes, buscar por nombre, filtrar por estado y seleccionar varias filas.
11. Dar de baja varias filas y comprobar que solo cambia ese grupo; reactivar una fila desde la lista de bajas.
12. Copiar desde Excel las columnas `Nombre` y `Boleta`, pegarlas en la tabla, revisar las filas incompletas y guardar.
13. Crear una actividad y escribir una pista breve en “Ayuda si te atoras”; abrirla como estudiante y comprobar que aparece cerrada hasta solicitarla.

## Compatibilidad y accesibilidad

- Probar en móvil y escritorio; los botones y enlaces principales deben tener al menos 44 px de alto.
- Navegar con teclado y comprobar el enlace “Saltar al contenido”.
- Verificar foco visible, contraste suficiente y textos comprensibles sin depender solo del color.
- Confirmar que los mensajes de error indican cómo continuar.

## Seguridad funcional

- Una docente solo puede ver y administrar sus grupos, actividades y estudiantes.
- Un estudiante no puede entrar a `/docente/**` ni consultar claves de actividades.
- No incluir `.env.local` en Git ni copiar claves en capturas o reportes.

## Fuera de esta fase

La orientación individual docente-estudiante es opcional. El panel debe servir para organizar, preparar contenido y detectar dónde conviene apoyar, sin convertir los comentarios docentes en requisito para que el curso avance ni en una calificación.

## Automatización

- `npm run test:contracts` verifica que las Server Actions mantengan validación de sesión y que el SQL no reabra las policies de unidades y actividades.
- El workflow de GitHub ejecuta typecheck, lint, build y la suite pgTAP de RLS en una base Supabase efímera. No usa el proyecto remoto ni secretos de producción.
