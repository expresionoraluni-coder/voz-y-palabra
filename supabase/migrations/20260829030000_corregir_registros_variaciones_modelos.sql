begin;

-- La fuente distingue cuatro registros: culto formal, culto informal,
-- inculto formal e inculto informal. Se reemplazan los ejemplos ambiguos
-- y se explicita que se clasifica el mensaje, no a la persona.
update public.actividades a
set
  instrucciones = 'Clasifica cada frase según el registro lingüístico que predomina: culto formal, culto informal, inculto formal o inculto informal. No juzgues a la persona: identifica únicamente la forma en que está construido el mensaje.',
  contenido = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          a.contenido,
          '{categorias}',
          jsonb_build_array('Culto formal', 'Culto informal', 'Inculto formal', 'Inculto informal')
        ),
        '{elementos}',
        jsonb_build_array(
          jsonb_build_object(
            'texto', 'La tilde o acento gráfico es un signo que marca la sílaba tónica de una palabra según las reglas de acentuación.',
            'categoria_correcta', 'Culto formal'
          ),
          jsonb_build_object(
            'texto', 'Conviene revisar las reglas de acentuación antes de redactar un texto formal, pues los errores ortográficos afectan la credibilidad del autor.',
            'categoria_correcta', 'Culto formal'
          ),
          jsonb_build_object(
            'texto', 'Algunas palabras llevan acento escrito y otras no; las reglas permiten saber cuáles son.',
            'categoria_correcta', 'Culto informal'
          ),
          jsonb_build_object(
            'texto', 'Yo creo que ahí se pone el acento, pero no estoy muy seguro; así me suena bien.',
            'categoria_correcta', 'Culto informal'
          ),
          jsonb_build_object(
            'texto', 'No profe, yo no quero revisar la acentuación; solo sé que algunas palabras llevan un palito.',
            'categoria_correcta', 'Inculto formal'
          ),
          jsonb_build_object(
            'texto', 'No sé, carnal; a mí me suenan igual con o sin rayita, ¿pa'' qué tanto rollo?',
            'categoria_correcta', 'Inculto informal'
          )
        )
      ),
      '{contexto}',
      to_jsonb('En esta actividad se usa la clasificación detallada de la fuente. El registro depende de la formalidad y del dominio de la norma; identifica el mensaje, no califiques a quien lo dice.'::text)
    ),
    '{instrucciones_momentos,actividad}',
    to_jsonb('Clasifica cada frase según el registro lingüístico que predomina: culto formal, culto informal, inculto formal o inculto informal. No juzgues a la persona: identifica únicamente la forma en que está construido el mensaje.'::text)
  )
where a.titulo = 'Registros lingüísticos'
  and exists (
    select 1
    from public.unidades u
    where u.id = a.unidad_id
      and u.orden = 1
  );

-- Se distinguen las deformaciones (caló y jerga) de las variaciones
-- (regionalismos y modismos), con dos ejemplos claros para cada etiqueta.
update public.actividades a
set
  instrucciones = 'Etiqueta cada expresión: Caló o Jerga si muestra una forma de hablar propia de un grupo social o profesional; Regionalismo si cambia según la región; Modismo si es un dicho o expresión con sentido figurado.',
  contenido = jsonb_set(
    jsonb_set(
      jsonb_set(
        a.contenido,
        '{contexto}',
        to_jsonb('Las deformaciones son transformaciones del código usadas por grupos sociales o profesionales: caló y jerga. Las variaciones dependen de la región o del sentido cultural de la expresión: regionalismos y modismos. Clasifica por el rasgo que explica cada ejemplo.'::text)
      ),
      '{fragmentos}',
      jsonb_build_array(
        jsonb_build_object(
          'texto', 'Ya chole, chango chilango; qué chafa chamba te chutas.',
          'etiqueta_correcta', 'Caló'
        ),
        jsonb_build_object(
          'texto', 'En plan, no tengo tema con mi besti; estuvo random.',
          'etiqueta_correcta', 'Caló'
        ),
        jsonb_build_object(
          'texto', 'En el partido, el árbitro marcó fuera de lugar y el delantero quedó en posición adelantada.',
          'etiqueta_correcta', 'Jerga'
        ),
        jsonb_build_object(
          'texto', 'La brigada revisó el cárter, cambió la bujía y ajustó el torque del motor.',
          'etiqueta_correcta', 'Jerga'
        ),
        jsonb_build_object(
          'texto', 'Para referirse al transporte público, en México dicen «camión» y en el Caribe «guagua».',
          'etiqueta_correcta', 'Regionalismo'
        ),
        jsonb_build_object(
          'texto', 'Al mismo objeto se le llama «popote», «pitillo» o «pajilla» según la región.',
          'etiqueta_correcta', 'Regionalismo'
        ),
        jsonb_build_object(
          'texto', 'El que es perico, dondequiera es verde.',
          'etiqueta_correcta', 'Modismo'
        ),
        jsonb_build_object(
          'texto', 'Aquí hay gato encerrado.',
          'etiqueta_correcta', 'Modismo'
        )
      )
    ),
    '{instrucciones_momentos,actividad}',
    to_jsonb('Etiqueta cada expresión: Caló o Jerga si muestra una forma de hablar propia de un grupo social o profesional; Regionalismo si cambia según la región; Modismo si es un dicho o expresión con sentido figurado.'::text)
  )
where a.titulo = 'Variaciones y deformaciones de la lengua'
  and exists (
    select 1
    from public.unidades u
    where u.id = a.unidad_id
      and u.orden = 1
  );

-- El texto ahora presenta de forma inequívoca las tres partes del modelo
-- expositivo general: introducción, desarrollo y conclusión.
update public.actividades a
set
  instrucciones = 'Observa el video. Lee el texto y reconoce la estructura general de un texto expositivo. Justifica tu elección con una idea clave.',
  contenido = jsonb_set(
    jsonb_set(
      jsonb_set(
        a.contenido,
        '{intro}',
        to_jsonb('Un texto expositivo general presenta un tema, desarrolla información y cierra recuperando la idea central.'::text)
      ),
      '{rondas,0,contexto}',
      to_jsonb('La energía solar es una fuente renovable que aprovecha la radiación del sol para producir electricidad. Los paneles solares convierten esa radiación en energía eléctrica y, cuando se integran con un consumo responsable, pueden disminuir el uso de combustibles fósiles. En conclusión, se trata de una alternativa que combina el aprovechamiento tecnológico con la reducción del impacto ambiental.'::text)
    ),
    '{rondas,0,ideas_clave}',
    jsonb_build_array('presenta el tema', 'explica su funcionamiento y sus beneficios', 'cierra con una valoración final')
  )
where a.titulo = 'Modelo expositivo general'
  and exists (
    select 1
    from public.unidades u
    where u.id = a.unidad_id
      and u.orden = 2
  );

-- El texto hace explícitas la tesis, la antítesis y la síntesis, tal como
-- define la fuente del modelo.
update public.actividades a
set
  instrucciones = 'Observa el video. Lee el texto, identifica la tesis, la antítesis y la síntesis, y justifica tu elección con una idea clave.',
  contenido = jsonb_set(
    jsonb_set(
      jsonb_set(
        a.contenido,
        '{intro}',
        to_jsonb('El modelo de tesis presenta una tesis o postura, considera una antítesis o postura contraria y llega a una síntesis que integra ambos puntos de vista.'::text)
      ),
      '{rondas,0,contexto}',
      to_jsonb('Incorporar el celular con reglas claras puede apoyar el aprendizaje, porque permite consultar fuentes y participar en actividades interactivas. Sin embargo, otras personas consideran que debe prohibirse durante la clase, ya que las notificaciones y el uso de redes sociales pueden distraer y dificultar la atención. En síntesis, el celular puede utilizarse de manera provechosa si el docente establece momentos, propósitos y reglas claras.'::text)
    ),
    '{rondas,0,ideas_clave}',
    jsonb_build_array('tesis o postura inicial', 'antítesis o postura contraria', 'síntesis que integra ambas posturas')
  )
where a.titulo = 'Modelo de tesis'
  and exists (
    select 1
    from public.unidades u
    where u.id = a.unidad_id
      and u.orden = 2
  );

commit;
