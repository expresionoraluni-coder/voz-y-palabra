function Linea({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800 ${className}`} />;
}

export default function LoadingCierreUnidad() {
  return (
    <main aria-busy="true" aria-live="polite" aria-label="Preparando el cierre de la unidad" className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <Linea className="h-4 w-28" />
      <div className="flex flex-col gap-3">
        <Linea className="h-4 w-20" />
        <Linea className="h-9 w-4/5" />
        <Linea className="h-5 w-full" />
      </div>
      <Linea className="h-52 w-full rounded-3xl" />
      <Linea className="h-28 w-full" />
      <p className="sr-only">Estamos preparando tu reflexión de cierre.</p>
    </main>
  );
}
