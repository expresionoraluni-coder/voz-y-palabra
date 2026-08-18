-- El RPC lee columnas internas para comprobar la pertenencia del reportante.
-- La validación completa vive dentro de la función; por eso se ejecuta como
-- SECURITY DEFINER y no se concede SELECT directo sobre esas columnas.
alter function public.registrar_reporte(text, uuid, uuid, uuid, uuid, uuid, text, text, text, jsonb)
  security definer;
