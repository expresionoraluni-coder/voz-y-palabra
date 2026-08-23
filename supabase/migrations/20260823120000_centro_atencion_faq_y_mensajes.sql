begin;

-- Centro de atención: separa la respuesta visible para la persona de la
-- nota interna, agrega una cola operativa y conserva un hilo seguro para
-- solicitar información adicional.
alter table public.reportes
  add column if not exists respuesta_publica text,
  add column if not exists asignado_a uuid references public.administradores(id) on delete set null,
  add column if not exists asignado_en timestamptz,
  add column if not exists fecha_limite timestamptz;

alter table public.reportes
  drop constraint if exists reportes_respuesta_publica_check,
  add constraint reportes_respuesta_publica_check
    check (respuesta_publica is null or length(trim(respuesta_publica)) between 1 and 2000);

-- Seguridad: no se exponen notas internas históricas como respuestas públicas.
-- Las respuestas públicas se capturan explícitamente desde el panel de atención.

alter table public.reporte_eventos
  add column if not exists respuesta_publica_anterior text,
  add column if not exists respuesta_publica_nueva text,
  add column if not exists asignado_anterior uuid,
  add column if not exists asignado_nuevo uuid,
  add column if not exists fecha_limite_anterior timestamptz,
  add column if not exists fecha_limite_nueva timestamptz;

create index if not exists reportes_cola_atencion_idx
  on public.reportes (estado, prioridad, fecha_limite, created_at desc);
create index if not exists reportes_asignado_a_idx
  on public.reportes (asignado_a, estado, created_at desc);

create or replace function public.establecer_fecha_limite_reporte()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.fecha_limite is null then
    new.fecha_limite := new.created_at + case new.prioridad
      when 'urgente' then interval '4 hours'
      when 'alta' then interval '24 hours'
      when 'baja' then interval '5 days'
      else interval '3 days'
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_establecer_fecha_limite_reporte on public.reportes;
create trigger trg_establecer_fecha_limite_reporte before insert on public.reportes for each row execute function public.establecer_fecha_limite_reporte();
revoke execute on function public.establecer_fecha_limite_reporte() from public, anon, authenticated;

update public.reportes
   set fecha_limite = created_at + case prioridad
     when 'urgente' then interval '4 hours'
     when 'alta' then interval '24 hours'
     when 'baja' then interval '5 days'
     else interval '3 days'
   end
 where fecha_limite is null;

create table if not exists public.reporte_mensajes (
  id uuid primary key default gen_random_uuid(),
  reporte_id uuid not null references public.reportes(id) on delete cascade,
  autor_id uuid not null references auth.users(id) on delete cascade,
  autor_tipo text not null check (autor_tipo in ('reportante', 'administrador')),
  mensaje text not null check (length(trim(mensaje)) between 2 and 2000),
  visible_para_reportante boolean not null default true,
  creado_en timestamptz not null default now()
);

create index if not exists reporte_mensajes_reporte_idx
  on public.reporte_mensajes (reporte_id, creado_en desc);

create table if not exists public.faq_articulos (
  id uuid primary key default gen_random_uuid(),
  audiencia text not null check (audiencia in ('estudiante', 'docente', 'ambos')),
  categoria text not null,
  slug text not null unique check (length(trim(slug)) between 3 and 120),
  titulo text not null check (length(trim(titulo)) between 3 and 160),
  resumen text not null check (length(trim(resumen)) between 10 and 500),
  pasos jsonb not null default '[]'::jsonb check (jsonb_typeof(pasos) = 'array'),
  preguntas jsonb not null default '[]'::jsonb check (jsonb_typeof(preguntas) = 'array'),
  rutas text[] not null default '{}'::text[],
  activo boolean not null default true,
  orden integer not null default 0,
  version integer not null default 1 check (version > 0),
  creado_por uuid references public.administradores(id) on delete set null,
  actualizado_por uuid references public.administradores(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists faq_articulos_audiencia_idx
  on public.faq_articulos (audiencia, activo, categoria, orden);

create table if not exists public.faq_interacciones (
  id uuid primary key default gen_random_uuid(),
  articulo_id uuid not null references public.faq_articulos(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  evento text not null check (evento in ('mostrado', 'abierto', 'util', 'no_util', 'reporte_creado')),
  reporte_id uuid references public.reportes(id) on delete set null,
  contexto jsonb not null default '{}'::jsonb check (jsonb_typeof(contexto) = 'object' and length(contexto::text) <= 4000),
  creado_en timestamptz not null default now()
);

create index if not exists faq_interacciones_articulo_idx
  on public.faq_interacciones (articulo_id, evento, creado_en desc);

alter table public.reporte_mensajes enable row level security;
alter table public.faq_articulos enable row level security;
alter table public.faq_interacciones enable row level security;

revoke all on public.reporte_mensajes, public.faq_articulos, public.faq_interacciones from public, anon, authenticated;
grant select on public.faq_articulos to authenticated;
grant insert, update, delete on public.faq_articulos to authenticated;
grant select, insert on public.reporte_mensajes, public.faq_interacciones to authenticated;

drop policy if exists "reportante o admin lee mensajes del reporte" on public.reporte_mensajes;
create policy "reportante o admin lee mensajes del reporte"
  on public.reporte_mensajes for select to authenticated
  using (
    public.es_administrador_activo()
    or (
      visible_para_reportante
      and exists (
        select 1 from public.reportes r
        where r.id = reporte_mensajes.reporte_id
          and r.reportante_id = (select auth.uid())
      )
    )
  );

drop policy if exists "participante agrega mensaje al reporte" on public.reporte_mensajes;
create policy "participante agrega mensaje al reporte"
  on public.reporte_mensajes for insert to authenticated
  with check (
    (
      autor_tipo = 'reportante'
      and autor_id = (select auth.uid())
      and visible_para_reportante
      and exists (
        select 1 from public.reportes r
        where r.id = reporte_mensajes.reporte_id
          and r.reportante_id = (select auth.uid())
          and r.estado <> 'cerrado'
      )
    )
    or (
      autor_tipo = 'administrador'
      and autor_id = (select auth.uid())
      and public.es_administrador_activo()
    )
  );

drop policy if exists "todos leen faq activa" on public.faq_articulos;
create policy "todos leen faq activa"
  on public.faq_articulos for select to authenticated
  using (activo or public.es_administrador_activo());

drop policy if exists "admin administra faq" on public.faq_articulos;
create policy "admin administra faq"
  on public.faq_articulos for all to authenticated
  using (public.es_administrador_activo())
  with check (public.es_administrador_activo());

drop policy if exists "usuario registra interacciones faq" on public.faq_interacciones;
create policy "usuario registra interacciones faq"
  on public.faq_interacciones for insert to authenticated
  with check (actor_id = (select auth.uid()));

drop policy if exists "admin lee interacciones faq" on public.faq_interacciones;
create policy "admin lee interacciones faq"
  on public.faq_interacciones for select to authenticated
  using (public.es_administrador_activo());

create or replace function public.registrar_interaccion_faq(
  p_articulo_id uuid,
  p_evento text,
  p_reporte_id uuid default null,
  p_contexto jsonb default '{}'::jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Sesión inválida.'; end if;
  if p_evento not in ('mostrado', 'abierto', 'util', 'no_util', 'reporte_creado') then
    raise exception 'La interacción de ayuda no es válida.';
  end if;
  if jsonb_typeof(coalesce(p_contexto, '{}'::jsonb)) <> 'object'
     or length(coalesce(p_contexto, '{}'::jsonb)::text) > 4000 then
    raise exception 'El contexto de ayuda no es válido.';
  end if;
  if not exists (select 1 from public.faq_articulos where id = p_articulo_id and (activo or public.es_administrador_activo())) then
    raise exception 'El artículo de ayuda no está disponible.';
  end if;
  insert into public.faq_interacciones (articulo_id, actor_id, evento, reporte_id, contexto)
  values (p_articulo_id, (select auth.uid()), p_evento, p_reporte_id, coalesce(p_contexto, '{}'::jsonb));
end;
$$;

revoke execute on function public.registrar_interaccion_faq(uuid, text, uuid, jsonb) from public, anon;
grant execute on function public.registrar_interaccion_faq(uuid, text, uuid, jsonb) to authenticated;

create or replace function public.registrar_mensaje_reporte(
  p_reporte_id uuid,
  p_mensaje text
)
returns table(id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_reporte public.reportes;
  v_admin boolean := public.es_administrador_activo();
  v_tipo text;
begin
  if auth.uid() is null then raise exception 'Sesión inválida.'; end if;
  if p_mensaje is null or length(trim(p_mensaje)) not between 2 and 2000 then
    raise exception 'El mensaje debe tener entre 2 y 2000 caracteres.';
  end if;
  select * into v_reporte
    from public.reportes r
   where r.id = p_reporte_id
     and (v_admin or r.reportante_id = (select auth.uid()));
  if not found then raise exception 'No encontramos este reporte.'; end if;
  if v_reporte.estado = 'cerrado' then raise exception 'Este reporte ya está cerrado.'; end if;
  v_tipo := case when v_admin then 'administrador' else 'reportante' end;
  return query
    insert into public.reporte_mensajes (reporte_id, autor_id, autor_tipo, mensaje, visible_para_reportante)
    values (p_reporte_id, (select auth.uid()), v_tipo, trim(p_mensaje), true)
    returning reporte_mensajes.id;
end;
$$;

revoke execute on function public.registrar_mensaje_reporte(uuid, text) from public, anon;
grant execute on function public.registrar_mensaje_reporte(uuid, text) to authenticated;

create or replace function public.proteger_reporte_atencion()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.id is distinct from old.id
    or new.reportante_id is distinct from old.reportante_id
    or new.reportante_tipo is distinct from old.reportante_tipo
    or new.estudiante_id is distinct from old.estudiante_id
    or new.docente_id is distinct from old.docente_id
    or new.grupo_id is distinct from old.grupo_id
    or new.unidad_id is distinct from old.unidad_id
    or new.actividad_id is distinct from old.actividad_id
    or new.categoria is distinct from old.categoria
    or new.descripcion is distinct from old.descripcion
    or new.ruta is distinct from old.ruta
    or new.contexto is distinct from old.contexto
    or new.created_at is distinct from old.created_at then
    raise exception 'Los datos originales del reporte no se pueden modificar.';
  end if;
  if auth.uid() is not null and not public.es_administrador_activo() then
    raise exception 'No tienes permiso para atender reportes.';
  end if;
  if new.asignado_a is not null and not exists (
    select 1 from public.administradores a where a.id = new.asignado_a and a.activo
  ) then
    raise exception 'La cuenta asignada no es un administrador activo.';
  end if;
  if auth.uid() is not null and new.atendido_por is not null and new.atendido_por <> (select auth.uid()) then
    raise exception 'El reporte debe quedar atendido por la cuenta administrativa activa.';
  end if;
  if new.estado is distinct from old.estado and not (
    (old.estado = 'recibido' and new.estado in ('en_revision', 'necesita_informacion', 'resuelto', 'cerrado'))
    or (old.estado = 'en_revision' and new.estado in ('necesita_informacion', 'resuelto', 'cerrado'))
    or (old.estado = 'necesita_informacion' and new.estado in ('en_revision', 'resuelto', 'cerrado'))
    or (old.estado = 'resuelto' and new.estado in ('en_revision', 'cerrado'))
    or (old.estado = 'cerrado' and new.estado = 'en_revision')
  ) then
    raise exception 'La transición del reporte no es válida.';
  end if;
  if new.estado is not distinct from old.estado
    and new.prioridad is not distinct from old.prioridad
    and new.resolucion is not distinct from old.resolucion
    and new.respuesta_publica is not distinct from old.respuesta_publica
    and new.asignado_a is not distinct from old.asignado_a
    and new.fecha_limite is not distinct from old.fecha_limite then
    return new;
  end if;
  if new.estado in ('resuelto', 'cerrado') and nullif(trim(new.resolucion), '') is null then
    raise exception 'Una atención resuelta o cerrada necesita una nota interna.';
  end if;
  if new.asignado_a is distinct from old.asignado_a then
    new.asignado_en := case when new.asignado_a is null then null else clock_timestamp() end;
  else
    new.asignado_en := old.asignado_en;
  end if;
  if auth.uid() is not null then new.atendido_por := (select auth.uid()); end if;
  if new.estado in ('resuelto', 'cerrado') and old.estado not in ('resuelto', 'cerrado') then
    new.atendido_en := clock_timestamp();
  elsif new.estado not in ('resuelto', 'cerrado') then
    new.atendido_en := null;
  else
    new.atendido_en := old.atendido_en;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists trg_proteger_reporte_atencion on public.reportes;
create trigger trg_proteger_reporte_atencion before update on public.reportes for each row execute function public.proteger_reporte_atencion();
revoke execute on function public.proteger_reporte_atencion() from public, anon, authenticated;

create or replace function public.registrar_evento_reporte_atencion()
returns trigger language plpgsql security definer set search_path = public, auth
as $$
begin
  if new.estado is not distinct from old.estado
    and new.prioridad is not distinct from old.prioridad
    and new.resolucion is not distinct from old.resolucion
    and new.respuesta_publica is not distinct from old.respuesta_publica
    and new.asignado_a is not distinct from old.asignado_a
    and new.fecha_limite is not distinct from old.fecha_limite then
    return new;
  end if;
  insert into public.reporte_eventos (
    reporte_id, actor_id, actor_nombre, estado_anterior, estado_nuevo,
    prioridad_anterior, prioridad_nueva, resolucion_anterior, resolucion_nueva,
    respuesta_publica_anterior, respuesta_publica_nueva, asignado_anterior,
    asignado_nuevo, fecha_limite_anterior, fecha_limite_nueva
  ) values (
    new.id,
    (select auth.uid()),
    coalesce((select a.nombre from public.administradores a where a.id = (select auth.uid())), 'Sistema'),
    old.estado, new.estado, old.prioridad, new.prioridad,
    old.resolucion, new.resolucion, old.respuesta_publica, new.respuesta_publica,
    old.asignado_a, new.asignado_a, old.fecha_limite, new.fecha_limite
  );
  return new;
end;
$$;

drop trigger if exists trg_registrar_evento_reporte_atencion on public.reportes;
create trigger trg_registrar_evento_reporte_atencion after update on public.reportes for each row execute function public.registrar_evento_reporte_atencion();
revoke execute on function public.registrar_evento_reporte_atencion() from public, anon, authenticated;

-- FAQ inicial: se puede editar desde el futuro editor administrativo sin
-- cambiar la interfaz del usuario.
insert into public.faq_articulos (audiencia, categoria, slug, titulo, resumen, pasos, preguntas, rutas, orden)
values
  ('estudiante', 'estudiante_acceso', 'estudiante-acceso', 'No puedo entrar', 'Comprueba el grupo, tu nombre y el NIP antes de pedir un reinicio.', $$["Usa el código exacto de tu grupo.","Escribe tu nombre como aparece en la lista.","Si olvidaste el NIP, pide a tu docente que lo reinicie."]$$::jsonb, $$[{"id":"causa","pregunta":"¿Qué sucede al intentar entrar?","opciones":[{"id":"grupo","etiqueta":"No encuentro mi grupo"},{"id":"nip","etiqueta":"Mi NIP no funciona"},{"id":"nombre","etiqueta":"Mi nombre no coincide"}]}]$$::jsonb, '{"/ingreso/estudiante"}', 10),
  ('estudiante', 'estudiante_actividad', 'estudiante-actividad', 'No puedo completar una actividad', 'Identifica si el bloqueo es por una dependencia, un intento ya usado o un error técnico.', $$["Guarda tu respuesta antes de salir.","Completa la actividad anterior y su reflexión si está pendiente.","Cada actividad tiene un solo intento; revisa antes de guardar."]$$::jsonb, $$[{"id":"causa","pregunta":"¿Qué impide continuar?","opciones":[{"id":"bloqueo","etiqueta":"La actividad está bloqueada"},{"id":"error","etiqueta":"Aparece un error"},{"id":"intento","etiqueta":"Ya no puedo volver a intentarlo"}]}]$$::jsonb, '{"/estudiante/actividad"}', 20),
  ('estudiante', 'estudiante_video', 'estudiante-video', 'El video no funciona', 'Prueba una conexión o dispositivo diferente y registra el nombre de la actividad si persiste.', $$["Comprueba tu conexión.","Actualiza una sola vez.","Prueba otra red o dispositivo."]$$::jsonb, $$[{"id":"resultado","pregunta":"¿Qué ocurre con el video?","opciones":[{"id":"no_abre","etiqueta":"No abre"},{"id":"lento","etiqueta":"Carga muy lento"},{"id":"incorrecto","etiqueta":"Es otro video"}]}]$$::jsonb, '{"/estudiante/actividad"}', 30),
  ('docente', 'docente_estudiantes', 'docente-estudiantes', 'Problema con estudiantes o NIP', 'Revisa la lista, duplicados y la ficha del estudiante antes de cambiar datos.', $$["Confirma nombre y boleta.","Corrige filas incompletas o duplicadas.","Reinicia el NIP desde la ficha del estudiante."]$$::jsonb, $$[{"id":"causa","pregunta":"¿Qué necesitas resolver?","opciones":[{"id":"carga","etiqueta":"No aparecen tras cargar el archivo"},{"id":"duplicado","etiqueta":"Hay estudiantes duplicados"},{"id":"nip","etiqueta":"Necesito reiniciar un NIP"}]}]$$::jsonb, '{"/docente/grupos"}', 40),
  ('docente', 'docente_actividad', 'docente-actividad', 'Crear o editar una actividad', 'Valida tipo, instrucciones, orden y respuesta esperada antes de guardar.', $$["Completa título, instrucciones, tipo y orden.","Revisa la vista previa.","Espera la confirmación antes de guardar otra vez."]$$::jsonb, $$[{"id":"causa","pregunta":"¿Qué parte presenta el problema?","opciones":[{"id":"guardar","etiqueta":"No puedo guardar"},{"id":"contenido","etiqueta":"No sé cómo configurar el contenido"},{"id":"bloqueo","etiqueta":"No puedo editarla"}]}]$$::jsonb, '{"/docente/unidades"}', 50),
  ('ambos', 'tecnico', 'problema-tecnico', 'La página no responde', 'Descarta una falla momentánea y describe la acción exacta que no respondió.', $$["Espera unos segundos.","Actualiza una sola vez.","Prueba otra red o dispositivo."]$$::jsonb, $$[{"id":"alcance","pregunta":"¿Dónde ocurre?","opciones":[{"id":"una","etiqueta":"Solo en esta pantalla"},{"id":"varias","etiqueta":"En varias pantallas"},{"id":"guardar","etiqueta":"Al guardar cambios"}]}]$$::jsonb, '{}', 60)
on conflict (slug) do update set
  titulo = excluded.titulo,
  resumen = excluded.resumen,
  pasos = excluded.pasos,
  preguntas = excluded.preguntas,
  rutas = excluded.rutas,
  updated_at = now();

commit;
