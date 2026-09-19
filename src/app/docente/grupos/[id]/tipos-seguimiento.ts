export type UnidadSeguimiento = {
  id: string;
  nombre: string;
  orden: number;
};

export type ActividadSeguimiento = {
  id: string;
  unidad_id: string;
  titulo: string;
  orden: number;
  tipo: string;
};

export type EntregaSeguimiento = {
  id: string;
  estudiante_id: string;
  actividad_id: string;
  estado: string | null;
  created_at: string;
  puntaje_auto: number | null;
};

export type ConfianzaSeguimiento = {
  estudiante_id: string;
  unidad_id: string;
  momento: "inicio" | "cierre";
  valor: number;
};

export type ReflexionSeguimiento = {
  id: string;
  estudiante_id: string;
  actividad_id: string | null;
  unidad_id: string | null;
  texto: string | null;
  momento: "prediccion" | "cierre";
  confianza: number | null;
  created_at: string;
};

export type BitacoraSeguimiento = {
  estudiante_id: string;
  unidad_id: string;
  meta: string;
  cumplida: boolean;
};
