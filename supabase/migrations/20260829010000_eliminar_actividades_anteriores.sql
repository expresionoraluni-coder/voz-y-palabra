begin;

-- Ya no se necesitan las actividades de prueba que fueron sustituidas por
-- una actividad independiente para cada modelo y por la progresión nueva de
-- grafías. Si ya fueron eliminadas manualmente, este cambio es idempotente.
delete from public.actividades a
 using public.unidades u
 where a.unidad_id = u.id
   and u.orden = 2
   and a.titulo in (
     'Repaso de letras que se confunden (versión anterior)',
     'Repaso general de modelos expositivos (actividad anterior)'
   );

commit;
