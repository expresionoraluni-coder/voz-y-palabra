begin;

-- Videos proporcionados para las actividades correspondientes.
update public.actividades
   set video_url = 'https://youtu.be/Ud8qpqlQ1PY'
 where titulo = 'Vicios de la redacción';

update public.actividades
   set video_url = 'https://youtu.be/B2JWzheCeMM'
 where titulo = 'Variaciones y deformaciones de la lengua';

commit;
