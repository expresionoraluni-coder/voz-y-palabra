begin;

update public.actividades
set titulo = 'Ideas principales, secundarias y terciarias'
where titulo = 'Ideas principal, secundaria y terciaria';

update public.actividades
set titulo = 'Ideas principales, secundarias y terciarias (nivel 2)'
where titulo = 'Ideas principal, secundaria y terciaria (nivel 2)';

commit;
