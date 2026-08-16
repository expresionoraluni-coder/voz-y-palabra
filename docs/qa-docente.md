# QA del recorrido docente

Esta lista valida que la docente pueda preparar y monitorear el curso con pocas decisiones y sin depender de la retroalimentación individual.

## Recorrido principal

1. Iniciar sesión como docente.
2. Ver en el panel el resumen de grupos, estudiantes y actividades.
3. Crear o abrir un grupo.
4. Agregar estudiantes y confirmar que la alerta o el avance lleva al perfil correcto.
5. Abrir una unidad, reconocer el objetivo y consultar las instrucciones de una actividad existente.
6. Crear una actividad con el editor guiado: elegir un tipo vigente, escribir título e instrucciones, configurar el contenido y revisar antes de guardar.
7. Editar una actividad existente sin cambiar su tipo y comprobar que sus cambios se reflejan en la consulta y en la vista estudiantil.
8. Añadir o actualizar el video de apoyo pegando un enlace de YouTube.
9. Abrir un caso de apoyo y comprobar que la interfaz explica que no es una calificación.
10. Añadir una orientación opcional, marcar el caso como atendido y comprobar que aparece para el estudiante.
11. Cerrar o recuperar la conexión y comprobar que se avisa antes de guardar cambios.
12. En la lista de estudiantes, buscar por nombre, filtrar por estado y seleccionar varias filas.
13. Dar de baja varias filas y comprobar que solo cambia ese grupo; reactivar una fila desde la lista de bajas.
14. Copiar desde Excel las columnas `Nombre` y `Boleta`, pegarlas en la tabla, revisar las filas incompletas y guardar.
15. Abrir una actividad existente como estudiante y confirmar que sus instrucciones, contenido, pista y video de apoyo se muestran correctamente.

## Compatibilidad y accesibilidad

- Probar en móvil y escritorio; los botones y enlaces principales deben tener al menos 44 px de alto.
- Navegar con teclado y comprobar el enlace “Saltar al contenido”.
- Verificar foco visible, contraste suficiente y textos comprensibles sin depender solo del color.
- Confirmar que los mensajes de error indican cómo continuar.

## Seguridad funcional

- Una docente solo puede ver y administrar sus grupos y estudiantes; puede crear actividades nuevas y editar las existentes usando únicamente los tipos vigentes, mientras que el video de apoyo se gestiona mediante enlaces de YouTube.
- Un estudiante no puede entrar a `/docente/**` ni consultar claves de actividades.
- No incluir `.env.local` en Git ni copiar claves en capturas o reportes.

## Fuera de esta fase

La orientación individual docente-estudiante es opcional. El panel debe servir para organizar, preparar contenido y detectar dónde conviene apoyar, sin convertir los comentarios docentes en requisito para que el curso avance ni en una calificación.

## Automatización

- `npm run test:contracts` verifica que las Server Actions mantengan validación de sesión y que el SQL no reabra las policies de unidades y actividades.
- El workflow de GitHub ejecuta typecheck, lint, build y la suite pgTAP de RLS en una base Supabase efímera. No usa el proyecto remoto ni secretos de producción.
