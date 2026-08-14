function Linea({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800 ${className}`} />;
}

export default function LoadingDocente() {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      aria-label="Cargando tu espacio docente"
      className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-6 py-10"
    >
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
      <Linea className="h-32 w-full" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Linea className="h-24" />
        <Linea className="h-24" />
        <Linea className="h-24" />
      </div>
      <div className="flex flex-col gap-3">
        <Linea className="h-5 w-36" />
        <Linea className="h-20 w-full" />
        <Linea className="h-20 w-full" />
        <Linea className="h-20 w-full" />
      </div>
      <p className="sr-only">Estamos preparando tu panel docente.</p>
    </main>
  );
}

