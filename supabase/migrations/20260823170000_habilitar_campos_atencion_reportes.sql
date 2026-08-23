begin;

-- La policy ya limita la escritura a administradores activos. Este grant
-- completa las columnas que el panel necesita guardar en una atención.
grant update (estado, prioridad, resolucion, respuesta_publica, asignado_a, fecha_limite)
  on public.reportes to authenticated;

commit;
