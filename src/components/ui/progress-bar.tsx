export default function ProgressBar({
  porcentaje,
  tono = "indigo",
  gradiente,
  etiqueta,
}: {
  porcentaje: number;
  tono?: "indigo" | "emerald";
  /** Clases de gradiente Tailwind, ej. "from-violet-500 to-violet-600", para temas por unidad. */
  gradiente?: string;
  /** Para listas con varias barras juntas (ej. avance por estudiante): sin
   * esto, un lector de pantalla solo anuncia "40 por ciento" sin decir de
   * quién o de qué. */
  etiqueta?: string;
}) {
  const clamped = Math.max(0, Math.min(100, porcentaje));
  const color = tono === "emerald" ? "bg-emerald-500" : "bg-indigo-600";
  const claseBarra = gradiente ? `bg-gradient-to-r ${gradiente}` : color;
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={etiqueta}
      className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
    >
      <div
        className={`h-full rounded-full ${claseBarra} transition-[width] duration-500 ease-out`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
