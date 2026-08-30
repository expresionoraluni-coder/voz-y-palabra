begin;

-- La secuencia de acceso debe coincidir con el orden visual: primero se cierra
-- ortografía, luego se trabaja vicios de redacción y después los cinco modelos.
update public.actividades a
   set orden = a.orden + 100
  from public.unidades u
 where a.unidad_id = u.id
   and u.orden = 2
   and a.titulo in (
     'Vicios de la redacción',
     'Modelo expositivo general',
     'Modelo causa-efecto',
     'Modelo de tesis',
     'Modelo de confrontación',
     'Modelo cronológico',
     'Repaso de letras que se confunden (versión anterior)',
     'Repaso general de modelos expositivos (actividad anterior)'
   );

update public.actividades a
   set orden = case a.titulo
     when 'Vicios de la redacción' then 8
     when 'Modelo expositivo general' then 9
     when 'Modelo causa-efecto' then 10
     when 'Modelo de tesis' then 11
     when 'Modelo de confrontación' then 12
     when 'Modelo cronológico' then 13
     when 'Repaso de letras que se confunden (versión anterior)' then 14
     when 'Repaso general de modelos expositivos (actividad anterior)' then 15
   end
  from public.unidades u
 where a.unidad_id = u.id
   and u.orden = 2
   and a.titulo in (
     'Vicios de la redacción',
     'Modelo expositivo general',
     'Modelo causa-efecto',
     'Modelo de tesis',
     'Modelo de confrontación',
     'Modelo cronológico',
     'Repaso de letras que se confunden (versión anterior)',
     'Repaso general de modelos expositivos (actividad anterior)'
   );

update public.actividades a
   set requiere_actividad_id = req.id
  from public.unidades u
  join public.actividades req on req.unidad_id = u.id
 where a.unidad_id = u.id
   and u.orden = 2
   and a.titulo = 'Modelo expositivo general'
   and req.titulo = 'Vicios de la redacción';

update public.actividades a
   set requiere_actividad_id = req.id
  from public.unidades u
  join public.actividades req on req.unidad_id = u.id
 where a.unidad_id = u.id
   and u.orden = 2
   and a.titulo = 'Modelo causa-efecto'
   and req.titulo = 'Modelo expositivo general';

update public.actividades a
   set requiere_actividad_id = req.id
  from public.unidades u
  join public.actividades req on req.unidad_id = u.id
 where a.unidad_id = u.id
   and u.orden = 2
   and a.titulo = 'Modelo de tesis'
   and req.titulo = 'Modelo causa-efecto';

update public.actividades a
   set requiere_actividad_id = req.id
  from public.unidades u
  join public.actividades req on req.unidad_id = u.id
 where a.unidad_id = u.id
   and u.orden = 2
   and a.titulo = 'Modelo de confrontación'
   and req.titulo = 'Modelo de tesis';

update public.actividades a
   set requiere_actividad_id = req.id
  from public.unidades u
  join public.actividades req on req.unidad_id = u.id
 where a.unidad_id = u.id
   and u.orden = 2
   and a.titulo = 'Modelo cronológico'
   and req.titulo = 'Modelo de confrontación';

commit;
