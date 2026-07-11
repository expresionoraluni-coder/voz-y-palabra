export type TemaUnidad = {
  icono: string;
  barra: string;
  chip: string;
};

const TEMAS: TemaUnidad[] = [
  {
    icono: "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
    barra: "from-violet-500 to-violet-600",
    chip: "bg-violet-500",
  },
  {
    icono: "bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400",
    barra: "from-teal-500 to-teal-600",
    chip: "bg-teal-500",
  },
  {
    icono: "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
    barra: "from-rose-500 to-rose-600",
    chip: "bg-rose-500",
  },
];

export function temaUnidad(orden: number): TemaUnidad {
  return TEMAS[(orden - 1) % TEMAS.length] ?? TEMAS[0];
}
