-- Los reportes solo se crean mediante registrar_reporte(), que valida la
-- identidad, el tipo de perfil y el contexto. Así no se pueden falsificar
-- desde el Data API el estado, prioridad o resolución iniciales.

revoke insert on public.reportes from authenticated;
drop policy if exists "estudiante o docente crea su reporte" on public.reportes;
