export default function ProgressBar({
  porcentaje,
  tono = "indigo",
}: {
  porcentaje: number;
  tono?: "indigo" | "emerald";
}) {
  const clamped = Math.max(0, Math.min(100, porcentaje));
  const color = tono === "emerald" ? "bg-emerald-500" : "bg-indigo-600";
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
    >
      <div
        className={`h-full rounded-full ${color} transition-[width] duration-500 ease-out`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
