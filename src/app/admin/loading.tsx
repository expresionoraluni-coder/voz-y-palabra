export default function LoadingAdministrador() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-5xl flex-col gap-6 px-6 py-10" aria-busy="true" aria-live="polite">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
      <div className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
      <div className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
      <span className="sr-only">Cargando el panel administrativo…</span>
    </div>
  );
}
