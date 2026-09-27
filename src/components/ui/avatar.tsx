export default function Avatar({ nombre, size = "md" }: { nombre: string; size?: "sm" | "md" | "lg" }) {
  const iniciales = nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const tamanos = { sm: "size-8 text-xs", md: "size-11 text-sm", lg: "size-14 text-lg" };

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white shadow-md shadow-indigo-500/25 ring-2 ring-white/80 dark:ring-slate-900 ${tamanos[size]}`}
      aria-hidden="true"
    >
      {iniciales || "?"}
    </div>
  );
}
