type TipoCarga = "inicio" | "unidad" | "actividad";

function Brillo({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`esqueleto-redondeado ${className}`} />;
}

const ETIQUETAS: Record<TipoCarga, string> = {
  inicio: "Preparando tu espacio…",
  unidad: "Abriendo tu ruta de aprendizaje…",
  actividad: "Preparando la actividad…",
};

export default function CargaEstudiante({ tipo = "inicio" }: { tipo?: TipoCarga }) {
  const esActividad = tipo === "actividad";

  return (
    <main
      aria-busy="true"
      aria-live="polite"
      aria-label={ETIQUETAS[tipo]}
      className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-6 py-10"
    >
      <div className="flex items-center gap-3">
        <Brillo className="size-11 rounded-2xl" />
        <div className="flex flex-1 flex-col gap-2">
          <Brillo className="h-3 w-24" />
          <Brillo className="h-7 w-3/5 max-w-72" />
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-white/60 bg-white/55 p-5 shadow-sm backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-900/55">
        <Brillo className="h-3 w-28" />
        <Brillo className="mt-4 h-6 w-4/5" />
        <Brillo className="mt-3 h-4 w-full" />
        <Brillo className="mt-2 h-4 w-2/3" />
        <Brillo className="mt-5 h-11 w-36" />
      </div>

      {esActividad ? (
        <div className="flex flex-col gap-3">
          <Brillo className="h-4 w-40" />
          <div className="rounded-[1.5rem] border border-white/60 bg-white/55 p-5 shadow-sm backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-900/55">
            <Brillo className="h-5 w-2/3" />
            <Brillo className="mt-5 h-28 w-full" />
            <Brillo className="mt-4 h-11 w-40" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Brillo className="h-4 w-32" />
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex items-center gap-4 rounded-[1.25rem] border border-white/60 bg-white/55 p-4 shadow-sm backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-900/55">
              <Brillo className="size-11 rounded-2xl" />
              <div className="flex flex-1 flex-col gap-2">
                <Brillo className="h-4 w-3/4" />
                <Brillo className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="sr-only">{ETIQUETAS[tipo]}</p>
    </main>
  );
}
