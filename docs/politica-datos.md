# Política operativa de datos

Este documento separa los controles técnicos ya implementados de las decisiones que debe aprobar la institución responsable. No sustituye el aviso de privacidad institucional ni asesoría jurídica.

## Inventario y finalidad

| Datos | Finalidad operativa | Acceso previsto |
| --- | --- | --- |
| Nombre, grupo y boleta o identificador escolar | Identificar a la persona dentro de su grupo y dar seguimiento al curso | La propia persona estudiante y la docente responsable del grupo; el servidor los usa para validar el acceso |
| Últimos cuatro dígitos de la boleta y NIP | Validar el primer acceso y autenticar accesos posteriores | Los últimos cuatro dígitos solo se comprueban contra la boleta; después se guarda únicamente el hash del NIP personal |
| Correo docente | Confirmar y recuperar una cuenta docente | La propia docente y los servicios de autenticación; no se expone en el catálogo público |
| Respuestas, puntajes, reflexiones, confianza y avance | Conservar evidencias de aprendizaje y mostrar retroalimentación | La propia persona estudiante y la docente responsable de su grupo |
| Avisos y calendario | Organizar la experiencia del grupo | Integrantes del grupo correspondiente y su docente |
| Solicitudes de ayuda y su historial | Resolver incidencias y dejar trazabilidad | La persona que reporta y la cuenta administrativa autorizada, según el campo |
| Eventos técnicos mínimos y límites de intentos | Prevenir abuso, investigar fallas y proteger cuentas | Procesos de servidor y administración autorizada |

No se debe escribir una contraseña, NIP, token ni información de terceras personas en una solicitud de ayuda.

## Alcance docente y educativo

La responsable académica del curso y primer punto de contacto es **M. en C. Monserrat Nieto Cuevas**. Los datos se usan con fines educativos para dar acceso, organizar actividades, conservar evidencias y orientar el aprendizaje. Podrán analizarse de forma agregada o anonimizada para investigación pedagógica y mejora del curso; no se emplearán nombres, identificadores ni respuestas atribuibles para ese fin sin la autorización institucional y, cuando corresponda, las autorizaciones aplicables.

Los borradores de respuestas abiertas se conservan solamente en el navegador y dispositivo que la persona estudiante está usando. No se envían a Supabase, no se califican y se eliminan al entregar la respuesta o cerrar sesión.

## Controles técnicos implementados

- [x] La boleta funciona como identificador y sus últimos cuatro dígitos sirven únicamente para el primer ingreso; no sustituyen el NIP personal posterior.
- [x] El primer acceso estudiantil comprueba los últimos cuatro dígitos de la boleta y, después, conserva únicamente el hash del NIP personal.
- [x] Una sesión pendiente de crear su NIP no puede consultar respuestas, progreso ni datos del grupo.
- [x] El correo docente debe confirmarse antes de completar el perfil.
- [x] La invitación docente se vincula a la cuenta que la usó y no se vuelve a pedir después de confirmar el correo.
- [x] La recuperación de contraseña no revela si un correo está registrado y limita solicitudes repetidas.
- [x] La cuenta administrativa exige MFA TOTP para operaciones protegidas.
- [x] Las políticas RLS separan estudiante, docente y administración; las claves de servicio permanecen en servidor.
- [x] Las rutas sensibles envían instrucciones de no almacenamiento en caché.
- [x] El catálogo curricular no contiene cuentas, grupos, entregas ni datos personales.

## Decisiones institucionales pendientes antes de producción

- [ ] Identificar a la institución responsable y publicar su denominación y medio de contacto.
- [ ] Confirmar la base y el aviso aplicables al tratamiento de datos de estudiantes, especialmente si participan menores.
- [ ] Aprobar qué campos son indispensables y retirar cualquier dato que no tenga una finalidad documentada.
- [ ] Definir plazos concretos de conservación para cuentas, grupos, evidencias, reflexiones, avance, reportes, auditoría y respaldos.
- [ ] Definir el cierre de curso: exportación institucional, anonimización o eliminación, responsables y fecha límite.
- [ ] Definir el procedimiento y plazo para solicitudes de acceso, corrección, exportación y eliminación.
- [ ] Definir quién autoriza altas y bajas de docentes y administradores, y con qué periodicidad se revisan.
- [ ] Definir si el alta docente debe limitarse a dominios institucionales o a correos previamente autorizados; el código de invitación y la confirmación de correo prueban autorización y control del buzón, pero no por sí solos que la persona sea docente.
- [ ] Confirmar proveedores, regiones, transferencias y acuerdos institucionales aplicables a Supabase y Netlify.
- [ ] Aprobar un procedimiento de incidentes: detección, contención, comunicación, recuperación y registro.

## Operación periódica

- [ ] Revisar mensualmente que docentes y administradores activos sigan autorizados.
- [ ] Revisar trimestralmente MFA, políticas RLS, funciones privilegiadas, llaves y advisors de Supabase.
- [ ] Probar restauración de respaldo y eliminación conforme al plazo aprobado.
- [ ] Registrar quién atiende cada solicitud de derechos, qué verificó y cuándo la cerró.
- [ ] Revisar este documento al menos una vez al año y después de cambios relevantes de datos, finalidades o proveedores.
- [ ] Mantener visible `/privacidad` desde la portada y el acceso, y comunicar cambios materiales.

## Aprobación

La plataforma no debe presentarse como respaldada por una política institucional completa hasta llenar y aprobar estos datos:

- Institución responsable: ______________________________
- Persona o área de contacto: ___________________________
- Medio de contacto: ___________________________________
- Versión o fecha del aviso aplicable: __________________
- Fecha de aprobación: _________________________________
- Próxima revisión: ____________________________________
