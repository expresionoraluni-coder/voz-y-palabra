-- Retira únicamente tipos que no tienen actividades. Si alguna instalación
-- los reutilizó, la condición evita borrar el catálogo referenciado.
delete from public.tipos_actividad t
 where t.nombre in ('constructor_ramificado', 'encontrar_corregir', 'grabacion_rubrica', 'reflexion_confianza')
   and not exists (
     select 1 from public.actividades a where a.tipo_id = t.id
   );
