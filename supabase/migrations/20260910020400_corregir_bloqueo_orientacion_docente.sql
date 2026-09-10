-- El RPC solo necesita bloquear la entrega que va a actualizar.
-- `FOR UPDATE` sin lista bloqueaba también las filas unidas de estudiantes y
-- grupos, lo que exigía UPDATE sobre tablas que el rol docente solo debe leer.
create or replace function public.registrar_orientacion_docente(
  p_entrega_id uuid,
  p_comentario text,
  p_estado_apoyo text,
  p_marcar_atendida boolean
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_estado_entrega text;
begin
  if auth.uid() is null then
    raise exception 'Tu sesión expiró. Entra de nuevo para continuar.';
  end if;

  if p_estado_apoyo is not null
     and p_estado_apoyo not in ('logrado', 'en_proceso', 'necesita_apoyo') then
    raise exception 'La señal de apoyo no es válida.';
  end if;

  if length(coalesce(p_comentario, '')) > 2000 then
    raise exception 'La orientación no puede superar 2000 caracteres.';
  end if;

  select en.estado
    into v_estado_entrega
    from public.entregas en
    join public.estudiantes e on e.id = en.estudiante_id
    join public.grupos g on g.id = e.grupo_id
   where en.id = p_entrega_id
     and g.docente_id = auth.uid()
   for update of en;

  if not found then
    raise exception 'No tienes permiso para acompañar esta entrega.';
  end if;

  if btrim(coalesce(p_comentario, '')) <> '' then
    insert into public.retroalimentacion_docente (entrega_id, docente_id, comentario)
    values (p_entrega_id, auth.uid(), btrim(p_comentario));
  end if;

  update public.entregas
     set evaluacion_docente = p_estado_apoyo,
         estado = case
           when coalesce(p_marcar_atendida, false)
                and v_estado_entrega = 'pendiente_revision' then 'revisada'
           else estado
         end
   where id = p_entrega_id;
end;
$$;

revoke execute on function public.registrar_orientacion_docente(uuid, text, text, boolean) from public, anon;
grant execute on function public.registrar_orientacion_docente(uuid, text, text, boolean) to authenticated;
