"use client";

export default function ErrorAdministrador({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">No pudimos cargar esta sección</h1>
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">La sesión sigue protegida. Intenta recargar la información; si el problema continúa, vuelve a entrar al panel.</p>
      <button type="button" onClick={() => reset()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Intentar de nuevo</button>
    </div>
  );
}
