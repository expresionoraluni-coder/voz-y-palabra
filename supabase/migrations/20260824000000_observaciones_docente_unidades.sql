begin;

-- Las instrucciones de orientación sí pueden corregirse después de una
-- entrega. También se permite publicar la variante de segundo intento de las
-- actividades de ideas sin abrir la puerta a cambiar su clave evaluable.
create or replace function public.proteger_actividad_con_entregas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tipo_id is distinct from old.tipo_id
     or ((new.contenido - 'instrucciones_momentos' - 'reintento_alternativo') is distinct from
         (old.contenido - 'instrucciones_momentos' - 'reintento_alternativo')
         and exists (select 1 from public.entregas where actividad_id = old.id)) then
    raise exception 'Esta actividad ya tiene entregas y su tipo o contenido no se puede modificar.';
  end if;
  return new;
end;
$$;

revoke execute on function public.proteger_actividad_con_entregas() from public, anon, authenticated;

-- Videos proporcionados por la docente. Los enlaces de teoría se guardan en
-- la actividad que los presenta; los videos A/B de "Cualidades" siguen siendo
-- campos distintos dentro de su contenido y no se rellenan con este enlace.
update public.actividades a
   set video_url = case
     when lower(a.titulo) = 'ideas principal, secundaria y terciaria' then 'https://youtu.be/qkSf4y_gc2g'
     when lower(a.titulo) = 'ideas principal, secundaria y terciaria (nivel 2)' then 'https://youtu.be/AmrkfWLJQ38'
     else a.video_url
   end
  from public.unidades u
 where a.unidad_id = u.id
   and u.orden = 1
   and lower(a.titulo) in (
     'ideas principal, secundaria y terciaria',
     'ideas principal, secundaria y terciaria (nivel 2)'
   );

update public.actividades a
   set video_url = 'https://youtu.be/b1avNGeJZlA'
  from public.unidades u
 where a.unidad_id = u.id
   and u.orden = 3
   and lower(a.titulo) = 'cualidades internas y externas de la exposición oral';

-- La actividad práctica debe declarar explícitamente que el producto final
-- es un resumen, además de la clasificación de ideas que ya realizaba.
update public.actividades a
   set instrucciones = 'Realiza un resumen del texto con las ideas que sí deben incluirse. Después clasifica las oraciones según si van o no van en el resumen.',
       contenido = case
         when a.contenido ? 'instrucciones_momentos' then jsonb_set(
           a.contenido,
           '{instrucciones_momentos,actividad}',
           to_jsonb('Realiza un resumen del texto con las ideas que sí deben incluirse. Después clasifica las oraciones según si van o no van en el resumen.'::text),
           true
         )
         else a.contenido
       end
  from public.unidades u
 where a.unidad_id = u.id
   and u.orden = 1
   and lower(a.titulo) = 'practica tu resumen';

-- Ajuste literal solicitado para la segunda actividad de corrección
-- ortográfica. Se actualizan ambos lugares porque las actividades existentes
-- ya tienen la instrucción copiada en el momento 3.
update public.actividades a
   set instrucciones = 'Este texto tiene errores de mayúsculas y de acentuación (tildes). Reescríbelo corrigiendo ambos.',
       contenido = jsonb_set(
         a.contenido,
         '{instrucciones_momentos,actividad}',
         to_jsonb('Este texto tiene errores de mayúsculas y de acentuación (tildes). Reescríbelo corrigiendo ambos.'::text),
         true
       )
  from public.unidades u
 where a.unidad_id = u.id
   and u.orden = 2
   and a.orden = 2;

-- Ideas principales: una segunda oportunidad usa un texto nuevo. Las
-- categorías se toman de la actividad publicada para no depender de una
-- variante de nombres elegida por la docente.
do $seed$
declare
  v_actividad record;
  v_categorias jsonb;
  v_principal text;
  v_secundaria text;
  v_terciaria text;
  v_alternativo jsonb;
begin
  for v_actividad in
    select a.id, a.titulo, a.contenido
      from public.actividades a
      join public.unidades u on u.id = a.unidad_id
     where u.orden = 1
       and lower(a.titulo) like 'ideas principal%'
       and not (a.contenido ? 'reintento_alternativo')
  loop
    v_categorias := coalesce(v_actividad.contenido -> 'categorias', '["Idea principal", "Idea secundaria", "Idea terciaria"]'::jsonb);
    v_principal := coalesce(v_categorias ->> 0, 'Idea principal');
    v_secundaria := coalesce(v_categorias ->> 1, 'Idea secundaria');
    v_terciaria := coalesce(v_categorias ->> 2, 'Idea terciaria');

    if lower(v_actividad.titulo) like '%nivel 2%' then
      v_alternativo := jsonb_build_object(
        'categorias', v_categorias,
        'elementos', jsonb_build_array(
          jsonb_build_object('texto', 'La práctica deliberada ayuda a convertir una habilidad difícil en un procedimiento más seguro.', 'categoria_correcta', v_principal),
          jsonb_build_object('texto', 'El estudiante revisa sus errores después de cada ejercicio.', 'categoria_correcta', v_secundaria),
          jsonb_build_object('texto', 'Esa revisión le permite elegir una estrategia distinta para el siguiente intento.', 'categoria_correcta', v_terciaria),
          jsonb_build_object('texto', 'La persona registra qué parte de la consigna le costó más trabajo.', 'categoria_correcta', v_secundaria),
          jsonb_build_object('texto', 'Con el tiempo, comparar los resultados fortalece su autonomía.', 'categoria_correcta', v_terciaria),
          jsonb_build_object('texto', 'Por eso, aprender no consiste solamente en repetir una respuesta.', 'categoria_correcta', v_principal)
        )
      );
    else
      v_alternativo := jsonb_build_object(
        'categorias', v_categorias,
        'elementos', jsonb_build_array(
          jsonb_build_object('texto', 'Organizar las ideas antes de escribir facilita que el lector siga el mensaje.', 'categoria_correcta', v_principal),
          jsonb_build_object('texto', 'Un esquema permite decidir qué información debe aparecer primero.', 'categoria_correcta', v_secundaria),
          jsonb_build_object('texto', 'También ayuda a detectar repeticiones y datos que no aportan al propósito.', 'categoria_correcta', v_secundaria),
          jsonb_build_object('texto', 'Si una idea explica a otra más general, funciona como apoyo terciario.', 'categoria_correcta', v_terciaria),
          jsonb_build_object('texto', 'Releer el borrador permite ajustar el orden y la relación entre las partes.', 'categoria_correcta', v_secundaria),
          jsonb_build_object('texto', 'La claridad del texto depende de que sus ideas mantengan una relación comprensible.', 'categoria_correcta', v_principal)
        )
      );
    end if;

    update public.actividades
       set contenido = jsonb_set(contenido, '{reintento_alternativo}', v_alternativo, true)
     where id = v_actividad.id;
  end loop;
end;
$seed$;

-- La regla de una sola entrega se conserva para el curso completo. Solo las
-- actividades que tienen `reintento_alternativo` admiten el segundo envío.
create or replace function public.guardar_entrega_auto(
  p_estudiante_id uuid,
  p_actividad_id uuid,
  p_respuesta jsonb,
  p_puntaje_auto integer,
  p_estado text
)
returns table(
  intentos integer,
  mejor_puntaje integer,
  puntaje_guardado integer,
  respuesta_guardada jsonb,
  respuesta_cliente jsonb
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_entrega public.entregas%rowtype;
  v_intentos_previos integer;
  v_intentos integer;
  v_mejor_puntaje integer;
  v_respuesta_limpia jsonb;
  v_meta jsonb;
  v_respuesta_cliente jsonb;
  v_respuesta_guardada jsonb;
  v_intentos_texto text;
  v_max_intentos integer := 1;
  v_tiene_variante boolean := false;
begin
  if p_estudiante_id is null or p_actividad_id is null then raise exception 'La entrega no es válida.'; end if;
  if p_respuesta is null or jsonb_typeof(p_respuesta) <> 'object' then raise exception 'La respuesta no es válida.'; end if;
  if p_puntaje_auto is not null and (p_puntaje_auto < 0 or p_puntaje_auto > 100) then raise exception 'El puntaje no es válido.'; end if;
  if p_estado not in ('completada', 'pendiente_revision') then raise exception 'El estado de la entrega no es válido.'; end if;

  select jsonb_typeof(contenido -> 'reintento_alternativo') = 'object'
    into v_tiene_variante
    from public.actividades
   where id = p_actividad_id;
  if v_tiene_variante then v_max_intentos := 2; end if;

  v_respuesta_limpia := public.sanitizar_respuesta_entrega(p_respuesta - '_meta');

  loop
    select * into v_entrega from public.entregas
     where estudiante_id = p_estudiante_id and actividad_id = p_actividad_id for update;

    if found then
      v_intentos_previos := 1;
      if v_entrega.respuesta is not null and jsonb_typeof(v_entrega.respuesta -> '_meta') = 'object' then
        v_intentos_texto := v_entrega.respuesta -> '_meta' ->> 'intentos';
        if v_intentos_texto ~ '^[1-2]$' then v_intentos_previos := v_intentos_texto::integer; end if;
      end if;
      if v_intentos_previos >= v_max_intentos then
        if v_max_intentos = 2 then
          raise exception 'Ya usaste los 2 intentos de esta actividad.' using errcode = 'check_violation';
        else
          raise exception 'Ya registraste el único intento de esta actividad.' using errcode = 'check_violation';
        end if;
      end if;

      v_intentos := v_intentos_previos + 1;
      v_mejor_puntaje := case
        when p_puntaje_auto is null then v_entrega.puntaje_auto
        else greatest(coalesce(v_entrega.puntaje_auto, 0), p_puntaje_auto)
      end;
      v_meta := jsonb_build_object('intentos', v_intentos, 'mejorPuntaje', v_mejor_puntaje);
      v_respuesta_cliente := v_respuesta_limpia || jsonb_build_object('_meta', v_meta);
      if v_tiene_variante then
        -- En la segunda oportunidad debe quedar visible el texto alterno al
        -- volver a entrar, aunque su puntaje sea menor que el primero.
        v_respuesta_guardada := v_respuesta_cliente;
      elsif p_puntaje_auto is not null and coalesce(v_entrega.puntaje_auto, -1) > p_puntaje_auto
        and v_entrega.respuesta is not null and jsonb_typeof(v_entrega.respuesta) = 'object' then
        v_respuesta_guardada := (public.sanitizar_respuesta_entrega(v_entrega.respuesta - '_meta')) || jsonb_build_object('_meta', v_meta);
      else
        v_respuesta_guardada := v_respuesta_cliente;
      end if;

      update public.entregas
         set respuesta = v_respuesta_guardada, estado = p_estado, puntaje_auto = v_mejor_puntaje
       where id = v_entrega.id;
      intentos := v_intentos; mejor_puntaje := v_mejor_puntaje; puntaje_guardado := v_mejor_puntaje;
      respuesta_guardada := v_respuesta_guardada; respuesta_cliente := v_respuesta_cliente;
      return next; return;
    end if;

    begin
      v_intentos := 1;
      v_mejor_puntaje := p_puntaje_auto;
      v_meta := jsonb_build_object('intentos', v_intentos, 'mejorPuntaje', v_mejor_puntaje);
      v_respuesta_cliente := v_respuesta_limpia || jsonb_build_object('_meta', v_meta);
      insert into public.entregas (estudiante_id, actividad_id, respuesta, estado, puntaje_auto)
      values (p_estudiante_id, p_actividad_id, v_respuesta_cliente, p_estado, v_mejor_puntaje);
      intentos := v_intentos; mejor_puntaje := v_mejor_puntaje; puntaje_guardado := v_mejor_puntaje;
      respuesta_guardada := v_respuesta_cliente; respuesta_cliente := v_respuesta_cliente;
      return next; return;
    exception when unique_violation then
      null;
    end;
  end loop;
end;
$$;

revoke execute on function public.guardar_entrega_auto(uuid, uuid, jsonb, integer, text)
  from public, anon, authenticated;
grant execute on function public.guardar_entrega_auto(uuid, uuid, jsonb, integer, text) to service_role;

-- Nuevos ejercicios de grafías. La cadena b/v → g/j → s/c/z → h acumula lo
-- ya practicado y deja un video independiente para cada grupo.
do $seed$
declare
  v_unidad uuid;
  v_tipo uuid;
  v_prev uuid;
  v_nuevo uuid;
  v_ae text;
begin
  select id into v_unidad from public.unidades where orden = 2;
  select id into v_tipo from public.tipos_actividad where nombre = 'corregir_ortografia';
  select aprendizaje_esperado into v_ae from public.actividades where unidad_id = v_unidad order by orden limit 1;

  if v_unidad is null or v_tipo is null then
    raise exception 'No se encontraron la Unidad 2 o el tipo corregir_ortografia.';
  end if;

  if not exists (select 1 from public.actividades where unidad_id = v_unidad and titulo = 'Uso de b y v') then
    -- Se usa un rango temporal para que la reorganización no deje órdenes
    -- repetidos mientras se insertan las nuevas actividades.
    update public.actividades set orden = orden + 100 where unidad_id = v_unidad;
    update public.actividades set orden = 1 where unidad_id = v_unidad and titulo = 'Mayúsculas y minúsculas';
    update public.actividades set orden = 2 where unidad_id = v_unidad and titulo = '+ Acentuación';
    select id into v_prev from public.actividades where unidad_id = v_unidad and orden = 2 order by created_at limit 1;

    insert into public.actividades (unidad_id, tipo_id, titulo, instrucciones, contenido, orden, aprendizaje_esperado, video_url, requiere_actividad_id)
    values (
      v_unidad, v_tipo, 'Uso de b y v',
      'Reescribe el texto completo. Corrige las mayúsculas y las letras b/v.',
      jsonb_build_object(
        'contexto', 'Este texto tiene errores de mayúsculas y de uso de b y v. Corrige ambos aspectos.',
        'texto_incorrecto', $$al comenzar la semana, Baleria revisa su horario y escribe en su libreta las actividades que debe resolver. Después observa sus abances, busca una breve explicación cuando se equivoca y buelve a intentar el ejercicio. Antes de cerrar la sesión, comparte con su equipo lo que aprendió y guarda una ebidencia de su trabajo.$$,
        'texto_correcto', $$Al comenzar la semana, Valeria revisa su horario y escribe en su libreta las actividades que debe resolver. Después observa sus avances, busca una breve explicación cuando se equivoca y vuelve a intentar el ejercicio. Antes de cerrar la sesión, comparte con su equipo lo que aprendió y guarda una evidencia de su trabajo.$$,
        'temas', jsonb_build_array('Mayúsculas', 'B/V')
      ),
      3, v_ae, 'https://youtu.be/H4r72vZkHAc', v_prev
    ) returning id into v_nuevo;
    v_prev := v_nuevo;

    insert into public.actividades (unidad_id, tipo_id, titulo, instrucciones, contenido, orden, aprendizaje_esperado, video_url, requiere_actividad_id)
    values (
      v_unidad, v_tipo, 'Uso de g y j',
      'Reescribe el texto completo. Corrige las mayúsculas, b/v y g/j.',
      jsonb_build_object(
        'contexto', 'Este texto reúne errores de mayúsculas, b/v y g/j. Corrige las tres grafías.',
        'texto_incorrecto', $$jorge organizó un biaje para que su grupo conociera el museo. Primero elijió una ruta breve, después dirijió al equipo y revisó que todos tubieran claro el objetivo. Al final, cada persona escribió qué aprendió y cómo bolbería a usar esa estrategia en otro trabajo.$$,
        'texto_correcto', $$Jorge organizó un viaje para que su grupo conociera el museo. Primero eligió una ruta breve, después dirigió al equipo y revisó que todos tuvieran claro el objetivo. Al final, cada persona escribió qué aprendió y cómo volvería a usar esa estrategia en otro trabajo.$$,
        'temas', jsonb_build_array('Mayúsculas', 'B/V', 'G/J')
      ),
      4, v_ae, 'https://youtu.be/FUFu6X1lguA', v_prev
    ) returning id into v_nuevo;
    v_prev := v_nuevo;

    insert into public.actividades (unidad_id, tipo_id, titulo, instrucciones, contenido, orden, aprendizaje_esperado, video_url, requiere_actividad_id)
    values (
      v_unidad, v_tipo, 'Uso de s, c y z',
      'Reescribe el texto completo. Corrige las mayúsculas, b/v, g/j y s/c/z.',
      jsonb_build_object(
        'contexto', 'Este texto reúne errores de mayúsculas, b/v, g/j y s/c/z. Corrige las cuatro grafías.',
        'texto_incorrecto', $$la desición de cambiar de estrategia fue presisa y útil. luisa organisó sus notas, bisualisó el problema y abansó paso a paso. Después revisó cada ejersicio, conoseió sus errores y escrivió una conclusión para explicar qué debía mejorar.$$,
        'texto_correcto', $$La decisión de cambiar de estrategia fue precisa y útil. Luisa organizó sus notas, visualizó el problema y avanzó paso a paso. Después revisó cada ejercicio, conoció sus errores y escribió una conclusión para explicar qué debía mejorar.$$,
        'temas', jsonb_build_array('Mayúsculas', 'B/V', 'G/J', 'S/C/Z')
      ),
      5, v_ae, 'https://youtu.be/RZ-8i2eTMrA', v_prev
    ) returning id into v_nuevo;
    v_prev := v_nuevo;

    insert into public.actividades (unidad_id, tipo_id, titulo, instrucciones, contenido, orden, aprendizaje_esperado, video_url, requiere_actividad_id)
    values (
      v_unidad, v_tipo, 'Uso de h',
      'Reescribe el texto completo. Corrige las mayúsculas, b/v, g/j, s/c/z y h.',
      jsonb_build_object(
        'contexto', 'Este texto reúne errores de mayúsculas y de las grafías b/v, g/j, s/c/z y h. Corrige todo lo que ya practicaste.',
        'texto_incorrecto', $$oy el grupo abló sobre el ábito de revisar antes de entregar. el profesor explicó asia dónde mirar cuando una palabra causa duda y pidió acer una lista de ejemplos. javier escrivió sus respuestas, organisó las ideas y desidió bolber a leer el texto para encontrar cada error.$$,
        'texto_correcto', $$Hoy el grupo habló sobre el hábito de revisar antes de entregar. El profesor explicó hacia dónde mirar cuando una palabra causa duda y pidió hacer una lista de ejemplos. Javier escribió sus respuestas, organizó las ideas y decidió volver a leer el texto para encontrar cada error.$$,
        'temas', jsonb_build_array('Mayúsculas', 'B/V', 'G/J', 'S/C/Z', 'H')
      ),
      6, v_ae, 'https://youtu.be/B3tsp17XQFM', v_prev
    ) returning id into v_nuevo;
    v_prev := v_nuevo;

    -- Se conserva el contenido anterior porque ya tiene entregas, pero se
    -- coloca después de la nueva progresión. El repaso integrador vigente sí
    -- queda como cierre de ortografía y ahora depende de "Uso de h".
    update public.actividades
       set orden = 7, requiere_actividad_id = v_prev
     where unidad_id = v_unidad and titulo = 'Repaso integrador de ortografía';
    update public.actividades
       set orden = 14, titulo = 'Repaso de letras que se confunden (versión anterior)'
     where unidad_id = v_unidad and titulo = '+ Letras que se confunden';
  end if;

  if v_prev is null then
    select id into v_prev
      from public.actividades
     where unidad_id = v_unidad
       and titulo = 'Uso de h'
     order by orden desc
     limit 1;
  end if;

  if not exists (select 1 from public.actividades where unidad_id = v_unidad and titulo = 'Vicios de la redacción') then
    insert into public.actividades (unidad_id, tipo_id, titulo, instrucciones, contenido, orden, aprendizaje_esperado, video_url, requiere_actividad_id)
    values (
      v_unidad,
      (select id from public.tipos_actividad where nombre = 'clasificacion'),
      'Vicios de la redacción',
      'Lee cada oración e identifica el vicio de redacción que presenta. Si la oración es clara y correcta, elige "Uso correcto".',
      jsonb_build_object(
        'contexto', 'Los vicios de redacción afectan la claridad, la precisión o la corrección de un mensaje. Reconoce el problema antes de corregirlo.',
        'categorias', jsonb_build_array('Uso correcto', 'Barbarismo', 'Solecismo', 'Pleonasmo', 'Cacofonía', 'Anfibología', 'Queísmo', 'Dequeísmo'),
        'elementos', jsonb_build_array(
          jsonb_build_object('texto', 'La estudiante revisó su borrador antes de entregarlo.', 'categoria_correcta', 'Uso correcto'),
          jsonb_build_object('texto', 'Ayer andé al mercado para comprar los materiales.', 'categoria_correcta', 'Barbarismo'),
          jsonb_build_object('texto', 'Hubieron muchos errores en el primer borrador.', 'categoria_correcta', 'Solecismo'),
          jsonb_build_object('texto', 'Lo vi con mis propios ojos.', 'categoria_correcta', 'Pleonasmo'),
          jsonb_build_object('texto', 'Parece que aparece una respuesta distinta en cada intento.', 'categoria_correcta', 'Cacofonía'),
          jsonb_build_object('texto', 'El director habló con el estudiante de su proyecto y luego él se fue.', 'categoria_correcta', 'Anfibología'),
          jsonb_build_object('texto', 'Me alegro que hayas revisado tus respuestas.', 'categoria_correcta', 'Queísmo'),
          jsonb_build_object('texto', 'Pienso de que la actividad quedó clara.', 'categoria_correcta', 'Dequeísmo')
        )
      ),
      13, v_ae, null, v_prev
    );
  end if;
end;
$seed$;

-- La docente solicitó una actividad independiente por cada modelo expositivo.
-- La actividad anterior tenía cuatro rondas y ya cuenta con entregas, por lo
-- que se conserva como repaso histórico y se crean cinco actividades nuevas:
-- modelo general, causa-efecto, tesis, confrontación y cronológico.
do $models$
declare
  v_unidad uuid;
  v_tipo uuid;
  v_ae text;
  v_vicios uuid;
  v_prev uuid;
begin
  select id into v_unidad from public.unidades where orden = 2;
  select id into v_tipo from public.tipos_actividad where nombre = 'opcion_justificacion';
  select aprendizaje_esperado into v_ae from public.actividades where unidad_id = v_unidad order by orden limit 1;
  select id into v_vicios
    from public.actividades
   where unidad_id = v_unidad and titulo = 'Vicios de la redacción';

  if v_unidad is null or v_tipo is null or v_vicios is null then
    raise exception 'No se encontraron los datos necesarios para los modelos expositivos.';
  end if;

  update public.actividades
     set titulo = 'Repaso general de modelos expositivos (actividad anterior)',
         orden = 15,
         video_url = null
   where unidad_id = v_unidad
     and titulo = 'Identifica el modelo expositivo';

  if not exists (select 1 from public.actividades where unidad_id = v_unidad and titulo = 'Modelo expositivo general') then
    insert into public.actividades (unidad_id, tipo_id, titulo, instrucciones, contenido, orden, aprendizaje_esperado, video_url, requiere_actividad_id)
    values (
      v_unidad, v_tipo, 'Modelo expositivo general',
      'Observa el video. Lee el texto y reconoce la estructura general de un texto expositivo. Justifica tu elección con una idea clave.',
      jsonb_build_object(
        'intro', 'Un texto expositivo general presenta un tema, desarrolla información y cierra recuperando la idea central.',
        'presentacion', 'todas_juntas',
        'rondas', jsonb_build_array(jsonb_build_object(
          'contexto', 'La energía solar aprovecha la luz del sol para producir electricidad. Primero se presenta el tema y su importancia; después se explica cómo funcionan los paneles y qué beneficios ofrecen; finalmente se recuerda que su uso puede disminuir el consumo de otras fuentes de energía.',
          'opciones', jsonb_build_array('Introducción, desarrollo y conclusión', 'Causa-Efecto', 'Cronológico', 'Confrontación'),
          'pregunta', '¿Qué estructura general sigue este texto?',
          'ideas_clave', jsonb_build_array('presenta el tema', 'desarrolla información', 'cierra con la idea central'),
          'respuesta_correcta', 'Introducción, desarrollo y conclusión'
        ))
      ),
      8, v_ae, 'https://youtu.be/IsjQnbKel6s', v_vicios
    );
  end if;
  select id into v_prev from public.actividades where unidad_id = v_unidad and titulo = 'Modelo expositivo general';

  if not exists (select 1 from public.actividades where unidad_id = v_unidad and titulo = 'Modelo causa-efecto') then
    insert into public.actividades (unidad_id, tipo_id, titulo, instrucciones, contenido, orden, aprendizaje_esperado, video_url, requiere_actividad_id)
    values (
      v_unidad, v_tipo, 'Modelo causa-efecto',
      'Observa el video. Lee el texto, identifica la causa y el efecto, y justifica tu elección con una idea clave.',
      jsonb_build_object(
        'intro', 'El modelo causa-efecto explica por qué ocurre un hecho y qué consecuencia produce.',
        'presentacion', 'todas_juntas',
        'rondas', jsonb_build_array(jsonb_build_object(
          'contexto', 'Dormir poco puede afectar el aprendizaje. Cuando una persona descansa menos de lo necesario, mantiene la atención durante menos tiempo y le cuesta recordar lo que estudió. Por eso, organizar un horario de sueño favorece la concentración durante la jornada escolar.',
          'opciones', jsonb_build_array('Causa-Efecto', 'Cronológico', 'Tesis-Antítesis-Síntesis', 'Confrontación'),
          'pregunta', '¿Qué modelo expositivo sigue este texto?',
          'ideas_clave', jsonb_build_array('dormir poco', 'afecta el aprendizaje', 'por eso'),
          'respuesta_correcta', 'Causa-Efecto'
        ))
      ),
      9, v_ae, 'https://youtu.be/yppNsvTosis', v_prev
    );
  end if;
  select id into v_prev from public.actividades where unidad_id = v_unidad and titulo = 'Modelo causa-efecto';

  if not exists (select 1 from public.actividades where unidad_id = v_unidad and titulo = 'Modelo de tesis') then
    insert into public.actividades (unidad_id, tipo_id, titulo, instrucciones, contenido, orden, aprendizaje_esperado, video_url, requiere_actividad_id)
    values (
      v_unidad, v_tipo, 'Modelo de tesis',
      'Observa el video. Lee el texto, identifica la tesis, la postura contraria y la síntesis, y justifica tu elección.',
      jsonb_build_object(
        'intro', 'El modelo de tesis presenta una postura, considera una postura contraria y llega a una síntesis o conclusión.',
        'presentacion', 'todas_juntas',
        'rondas', jsonb_build_array(jsonb_build_object(
          'contexto', 'Leer antes de dormir puede ser una buena estrategia para algunas personas porque ayuda a relajarse. Otras prefieren escuchar música tranquila, pues consideran que así despejan la mente sin forzar la vista. En síntesis, ambas opciones pueden funcionar si favorecen un descanso sin distracciones.',
          'opciones', jsonb_build_array('Causa-Efecto', 'Cronológico', 'Tesis-Antítesis-Síntesis', 'Confrontación'),
          'pregunta', '¿Qué modelo expositivo sigue este texto?',
          'ideas_clave', jsonb_build_array('postura inicial', 'postura contraria', 'en síntesis'),
          'respuesta_correcta', 'Tesis-Antítesis-Síntesis'
        ))
      ),
      10, v_ae, 'https://youtu.be/Rwn1A0425eg', v_prev
    );
  end if;
  select id into v_prev from public.actividades where unidad_id = v_unidad and titulo = 'Modelo de tesis';

  if not exists (select 1 from public.actividades where unidad_id = v_unidad and titulo = 'Modelo de confrontación') then
    insert into public.actividades (unidad_id, tipo_id, titulo, instrucciones, contenido, orden, aprendizaje_esperado, video_url, requiere_actividad_id)
    values (
      v_unidad, v_tipo, 'Modelo de confrontación',
      'Observa el video. Lee el texto, identifica las dos posiciones que se comparan y justifica tu elección.',
      jsonb_build_object(
        'intro', 'El modelo de confrontación presenta dos opciones o posiciones y contrasta sus características, ventajas o limitaciones.',
        'presentacion', 'todas_juntas',
        'rondas', jsonb_build_array(jsonb_build_object(
          'contexto', 'Trabajar de manera individual permite avanzar al propio ritmo y tomar decisiones sin esperar a otras personas. En cambio, trabajar en equipo facilita compartir ideas y distribuir las tareas, aunque exige ponerse de acuerdo. Las dos formas pueden ser útiles según el propósito y el tiempo disponible.',
          'opciones', jsonb_build_array('Causa-Efecto', 'Cronológico', 'Tesis-Antítesis-Síntesis', 'Confrontación'),
          'pregunta', '¿Qué modelo expositivo sigue este texto?',
          'ideas_clave', jsonb_build_array('trabajo individual', 'en cambio', 'trabajo en equipo'),
          'respuesta_correcta', 'Confrontación'
        ))
      ),
      11, v_ae, 'https://youtu.be/bacAPUP_90Q', v_prev
    );
  end if;
  select id into v_prev from public.actividades where unidad_id = v_unidad and titulo = 'Modelo de confrontación';

  if not exists (select 1 from public.actividades where unidad_id = v_unidad and titulo = 'Modelo cronológico') then
    insert into public.actividades (unidad_id, tipo_id, titulo, instrucciones, contenido, orden, aprendizaje_esperado, video_url, requiere_actividad_id)
    values (
      v_unidad, v_tipo, 'Modelo cronológico',
      'Observa el video. Lee el texto, reconoce el orden temporal de las acciones y justifica tu elección con una idea clave.',
      jsonb_build_object(
        'intro', 'El modelo cronológico organiza la información según el orden en que suceden los hechos o los pasos de un proceso.',
        'presentacion', 'todas_juntas',
        'rondas', jsonb_build_array(jsonb_build_object(
          'contexto', 'Primero, el equipo eligió el tema de su exposición. Después, buscó información en dos fuentes y tomó notas. Luego organizó las ideas en un esquema y preparó las imágenes. Finalmente, ensayó la presentación y ajustó el tiempo de cada integrante.',
          'opciones', jsonb_build_array('Causa-Efecto', 'Cronológico', 'Tesis-Antítesis-Síntesis', 'Confrontación'),
          'pregunta', '¿Qué modelo expositivo sigue este texto?',
          'ideas_clave', jsonb_build_array('primero', 'después', 'finalmente'),
          'respuesta_correcta', 'Cronológico'
        ))
      ),
      12, v_ae, 'https://youtu.be/hhBapygAB7M', v_prev
    );
  end if;
end;
$models$;

commit;
