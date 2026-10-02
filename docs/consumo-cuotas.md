# Consumo y cuotas de la plataforma

Este análisis usa una consulta de solo lectura al proyecto Supabase configurado
para la aplicación el **2 de octubre de 2026**. No exporta nombres, respuestas
ni reflexiones; únicamente cuenta filas y revisa los límites de las tablas.

## Fotografía actual

| Recurso | Filas actuales |
| --- | ---: |
| Grupos | 5 |
| Estudiantes activos | 221 |
| Docentes | 1 |
| Unidades | 3 |
| Actividades | 31 |
| Entregas | 896 |
| Reflexiones/predicciones | 1,770 |
| Metas de bitácora | 171 |
| Autoevaluaciones de confianza | 172 |
| Reportes | 3 |
| Eventos de calendario | 167 |
| Avisos | 5 |

## Proyección de cierre

La tabla `entregas` tiene una fila máxima por estudiante y actividad. Si las
221 personas completan las 31 actividades, el techo esperado es:

```text
221 × 31 = 6,851 entregas
```

Faltarían aproximadamente 5,955 entregas respecto a la fotografía actual.

`reflexiones` conserva, como máximo orientativo, una predicción y una reflexión
por actividad, además del cierre de cada una de las tres unidades:

```text
221 × (31 predicciones + 31 reflexiones + 3 cierres) = 14,365 filas
```

Es una cota conservadora: el flujo real puede registrar menos predicciones o
actividades pendientes. Las metas y autoevaluaciones tienen índices únicos por
estudiante/unidad/momento, así que no crecen indefinidamente por reintentos.

## Evaluación del plan gratuito

Con 221 estudiantes y 31 actividades, el uso esperado es pequeño frente a los
límites de Supabase Free: 500 MB de base de datos, 50,000 usuarios activos
mensuales, 5 GB de egreso y 1 GB de almacenamiento. El riesgo principal no es
el número de filas sino el tamaño del texto libre y de las respuestas JSON.

La base limita cada respuesta de entrega a 20,000 caracteres y cada reflexión
a 5,000. Incluso llenando esos límites, la proyección de texto crudo queda por
debajo de 220 MB antes de índices y metadatos; debe verificarse el tamaño real
en el panel de Supabase durante el semestre. El plan gratuito no incluye
respaldos automáticos y conserva los logs por poco tiempo, por lo que el
respaldo institucional debe ser un procedimiento separado.

## Netlify y los 300 créditos

Para no consumir créditos innecesariamente:

1. probar localmente y usar previews antes de publicar;
2. agrupar cambios y hacer pocos despliegues de producción;
3. evitar regenerar o subir imágenes grandes;
4. mantener el monitor de disponibilidad en un servicio gratuito externo;
5. revisar el panel de Usage & billing después de cada despliegue y al cierre
   de cada semana.

La imagen del colibrí pasó de aproximadamente 1.3 MB a una versión WebP de
aproximadamente 22 KB. La imagen social PNG pesa aproximadamente 78 KB. Esto
reduce transferencia y tamaño del despliegue sin cambiar la experiencia.

El límite exacto y la forma de contabilizar créditos dependen del plan de la
cuenta Netlify; las cifras de este documento no sustituyen el panel de Usage &
billing.

## Consultas periódicas recomendadas

Al menos una vez por semana, revisar:

- tamaño de la base de datos;
- egreso y almacenamiento de Supabase;
- usuarios activos mensuales;
- créditos, despliegues y solicitudes de Netlify;
- respaldos exportados antes de borrar el semestre anterior.

El borrado de cierre debe ejecutarse después de la exportación autorizada y
conservar únicamente el registro administrativo de que se realizó.
