-- La primera conversión pudo insertar el mensaje en la misma sentencia sin
-- que el UPDATE lo viera aún. Esta pasada es idempotente y solo limpia campos
-- cuya copia ya existe en la conversación visible para el reportante.
update public.reportes reporte
set respuesta_publica = null
where reporte.respuesta_publica is not null
  and exists (
    select 1
    from public.reporte_mensajes mensaje
    where mensaje.reporte_id = reporte.id
      and mensaje.autor_tipo = 'administrador'
      and mensaje.mensaje = trim(reporte.respuesta_publica)
  );
