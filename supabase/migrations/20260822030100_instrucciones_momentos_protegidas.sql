begin;

-- Las instrucciones por momento son texto de orientación y no cambian la
-- respuesta correcta. Por eso pueden agregarse a actividades ya entregadas,
-- sin abrir la puerta a modificar su dinámica o contenido evaluable.
create or replace function public.proteger_actividad_con_entregas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.tipo_id is distinct from old.tipo_id
      or (new.contenido - 'instrucciones_momentos') is distinct from (old.contenido - 'instrucciones_momentos'))
     and exists (select 1 from public.entregas where actividad_id = old.id) then
    raise exception 'Esta actividad ya tiene entregas y su tipo o contenido no se puede modificar.';
  end if;
  return new;
end;
$$;
revoke execute on function public.proteger_actividad_con_entregas() from public, anon, authenticated;

update public.actividades
set contenido = contenido || jsonb_build_object(
  'instrucciones_momentos', jsonb_build_object(
    'presentacion', 'Lee el propósito de la actividad y piensa qué esperas comprender o lograr antes de continuar.',
    'video', 'Observa el video con atención. Identifica una idea, ejemplo o estrategia que te ayude a resolver la actividad.',
    'actividad', coalesce(instrucciones, '')
  )
)
where not (contenido ? 'instrucciones_momentos');

commit;

