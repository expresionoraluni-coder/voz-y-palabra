-- La primera versión del panel administrativo atiende reportes y observa
-- identidades operativas. Las métricas educativas profundas se agregarán
-- mediante consultas agregadas específicas, no abriendo tablas completas.
drop policy if exists "administrador observa unidades" on public.unidades;
drop policy if exists "administrador observa actividades" on public.actividades;
drop policy if exists "administrador observa entregas" on public.entregas;
drop policy if exists "administrador observa reflexiones" on public.reflexiones;
drop policy if exists "administrador observa confianza" on public.autoevaluaciones_confianza;
drop policy if exists "administrador observa insignias otorgadas" on public.insignias_otorgadas;
drop policy if exists "administrador observa avisos" on public.avisos;
drop policy if exists "administrador observa eventos" on public.eventos;
drop policy if exists "administrador observa bitacora" on public.bitacora;
