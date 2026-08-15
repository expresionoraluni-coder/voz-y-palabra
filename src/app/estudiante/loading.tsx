function Linea({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800 ${className}`} />;
}

export default function LoadingEstudiante() {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      aria-label="Cargando tu espacio de estudiante"
      className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-6 py-10"
    >
      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Cargando tu avance…</p>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Linea className="size-11 rounded-full" />
          <div className="flex flex-col gap-2">
            <Linea className="h-5 w-36" />
            <Linea className="h-4 w-24" />
          </div>
        </div>
        <Linea className="h-9 w-20" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Linea className="h-24" />
        <Linea className="h-24" />
      </div>
      <div className="flex flex-col gap-3">
        <Linea className="h-5 w-28" />
        <Linea className="h-24 w-full" />
        <Linea className="h-24 w-full" />
        <Linea className="h-24 w-full" />
      </div>
      <p className="sr-only">Estamos preparando tu avance.</p>
    </main>
  );
}
