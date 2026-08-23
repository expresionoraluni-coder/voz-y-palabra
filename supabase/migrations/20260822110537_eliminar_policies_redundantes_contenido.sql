begin;

-- Las policies restrictivas basadas solo en is_anonymous eran redundantes:
-- la policy docente ya exige perfil docente, y la de administración exige
-- MFA/AAL2. Además, al ser FOR ALL, daban a cualquier sesión permanente
-- permiso de escritura sobre unidades y actividades.
drop policy if exists "solo perfiles docentes permanentes usan unidades" on public.unidades;
drop policy if exists "solo perfiles docentes permanentes usan actividades" on public.actividades;

commit;
