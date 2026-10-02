# Política operativa de datos

Este documento separa los controles técnicos ya implementados de las decisiones que debe aprobar la institución responsable. No sustituye el aviso de privacidad institucional ni asesoría jurídica.

## Responsable y alcance declarados

La responsable operativa del sitio es la **M. en C. Monserrat Nieto Cuevas**,
adscrita al Instituto Politécnico Nacional, Centro de Estudios Científicos y
Tecnológicos No. 1 «Gonzalo Vázquez Vela», Departamento de Unidades de
Aprendizaje del Área Humanística, Academia de Lengua y Comunicación.

El IPN y el CECyT 1 se consignan como adscripción académica; la responsable
declara que no son responsables directos del sitio. El alcance actual se limita
a estudiantes de primer semestre que cursan Expresión Oral y Escrita I con la
M. en C. Monserrat Nieto Cuevas.

Contacto de la responsable: [mnieto@ipn.mx](mailto:mnieto@ipn.mx).
Contacto administrativo alterno: [digp.inv.ipn@gmail.com](mailto:digp.inv.ipn@gmail.com),
gestionado por un integrante del equipo de investigación que también opera el
perfil administrador, bajo autorización y supervisión de la responsable. Antes
de publicar esta información como aviso legal debe revisarse con el área
institucional correspondiente.

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

Los datos se usan con fines educativos para dar acceso, organizar actividades,
conservar evidencias y orientar el aprendizaje. Durante el semestre, la
responsable puede exportar nombre, resultados de actividades y reflexiones para
analizar resultados, impacto, metacognición y autonomía.

La responsable y su equipo de investigación pueden consultar esa exportación
bajo compromisos éticos firmados y supervisión de la M. en C. Monserrat Nieto
Cuevas. El análisis de investigación se realizará sobre el comportamiento
general del grupo, no para perfilar o señalar a un estudiante específico. Antes
de compartir resultados fuera del equipo autorizado deben retirarse nombres e
identificadores o agregarse los datos de forma que no permitan reidentificar a
una persona.

## Conservación y cierre del semestre

La regla operativa declarada es conservar la información durante el semestre
en curso y un mes adicional. Al terminar ese plazo, la responsable debe:

1. completar la exportación académica autorizada;
2. verificar que el análisis de investigación use datos agregados o
   desidentificados;
3. eliminar cuentas, grupos, entregas, reflexiones, reportes y registros
   asociados al semestre;
4. registrar la fecha, el alcance y la persona que verificó la eliminación.

La eliminación de copias de respaldo y de retenciones propias de Supabase,
Netlify o el correo debe confirmarse en los acuerdos y configuraciones de cada
proveedor; esta política no puede prometer una purga inmediata si el proveedor
conserva respaldos por un periodo técnico adicional.

Los borradores de respuestas abiertas se conservan solamente en el navegador y dispositivo que la persona estudiante está usando. No se envían a Supabase, no se califican y se eliminan al entregar la respuesta o cerrar sesión.
Si una pestaña queda abandonada, el borrador se elimina automáticamente al superar 24 horas; la limpieza es oportunista al volver a leerlo y no requiere enviar el texto al servidor.

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
- [x] Los errores de consultas y mutaciones conservan código y contexto técnico únicamente en registros del servidor, sin mostrar detalles de Postgres a estudiantes o docentes.
- [x] La limpieza de usuarios anónimos es un procedimiento separado, en simulación por defecto, que comprueba referencias antes de permitir cualquier eliminación.

## Decisiones institucionales pendientes antes de producción

- [x] Identificar a la responsable operativa y publicar un medio de contacto; falta la revisión jurídica antes de presentarlo como aviso institucional.
- [ ] Confirmar la base y el aviso aplicables al tratamiento de datos de estudiantes, especialmente si participan menores.
- [ ] Aprobar qué campos son indispensables y retirar cualquier dato que no tenga una finalidad documentada.
- [x] Definir un plazo operativo: semestre en curso más un mes adicional.
- [x] Definir el cierre de curso: exportación académica autorizada y eliminación posterior, bajo supervisión de la responsable.
- [ ] Definir el procedimiento y plazo para solicitudes de acceso, corrección, exportación y eliminación.
- [x] Definir quién autoriza altas y bajas: actualmente solo la M. en C. Monserrat Nieto Cuevas; falta documentar la periodicidad de revisión.
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
