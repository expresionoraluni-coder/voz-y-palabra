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
      className={`flex shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 ${tamanos[size]}`}
      aria-hidden="true"
    >
      {iniciales || "?"}
    </div>
  );
}
