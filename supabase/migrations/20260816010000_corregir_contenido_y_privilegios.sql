-- Corrige contenido publicado y cierra el acceso directo a tablas internas.

-- U1-A8: sustituye el porcentaje no verificable por un dato publicado por el IFT.
update public.actividades a
   set contenido = jsonb_set(
     a.contenido,
     '{elementos,0,texto}',
     to_jsonb('Según la Encuesta Nacional de Consumo de Contenidos Audiovisuales 2023 del IFT, el teléfono celular fue el dispositivo más utilizado por niñas, niños y adolescentes para consumir contenidos por internet: 78%.'::text)
   )
  from public.unidades u
 where a.unidad_id = u.id
   and u.orden = 1
   and a.orden = 8;

-- U1-A9: aclara que la primera oración presenta el tema y que se clasifican
-- las seis oraciones seleccionadas que aparecen después.
update public.actividades a
   set instrucciones = 'Lee el párrafo. La primera oración presenta el tema; clasifica las seis oraciones siguientes según su nivel de importancia.'
  from public.unidades u
 where a.unidad_id = u.id
   and u.orden = 1
   and a.orden = 9;

-- U2: cada ejercicio de corrección explica exactamente qué debe modificarse.
update public.actividades a
   set contenido = jsonb_set(
     a.contenido,
     '{contexto}',
     to_jsonb('Lee el texto completo antes de corregirlo. Todos los errores son de mayúsculas o minúsculas.'::text)
   )
  from public.unidades u
 where a.unidad_id = u.id
   and u.orden = 2
   and a.orden = 1;

update public.actividades a
   set contenido = jsonb_set(
     a.contenido,
     '{contexto}',
     to_jsonb('Además de mayúsculas, este texto tiene errores de acentuación (tildes), incluidos casos como él/el y qué/que, que cambian de significado según lleven tilde o no.'::text)
   )
  from public.unidades u
 where a.unidad_id = u.id
   and u.orden = 2
   and a.orden = 2;

update public.actividades a
   set contenido = jsonb_set(
     a.contenido,
     '{contexto}',
     to_jsonb('Suma letras que se confunden (b/v, s/c/z, g/j, h) a lo que ya practicaste: mayúsculas y tildes.'::text)
   )
  from public.unidades u
 where a.unidad_id = u.id
   and u.orden = 2
   and a.orden = 3;

update public.actividades a
   set contenido = jsonb_set(
     a.contenido,
     '{contexto}',
     to_jsonb('Lee todo el texto antes de corregirlo. Junta mayúsculas, tildes (incluidas las diacríticas) y letras que se confunden en un mismo texto.'::text)
   )
  from public.unidades u
 where a.unidad_id = u.id
   and u.orden = 2
   and a.orden = 4;

-- U3-A5: una exposición en equipo también requiere comprender el conjunto.
update public.actividades a
   set contenido = jsonb_set(
     a.contenido,
     '{celda_correcta,2,1}',
     to_jsonb('Debes dominar tu parte y comprender la idea general del resto para mantener la coherencia y responder preguntas.'::text)
   )
  from public.unidades u
 where a.unidad_id = u.id
   and u.orden = 3
   and a.orden = 5;

-- Estas tablas solo las usan las funciones SECURITY DEFINER internas. RLS
-- sigue activo, pero además se elimina el privilegio directo del Data API.
revoke all on table
  public.configuracion_plataforma,
  public.intentos_codigo_invitacion,
  public.intentos_nombre_estudiante,
  public.intentos_nombre_grupo
from public, anon, authenticated;

grant all on table
  public.configuracion_plataforma,
  public.intentos_codigo_invitacion,
  public.intentos_nombre_estudiante,
  public.intentos_nombre_grupo
to service_role;
