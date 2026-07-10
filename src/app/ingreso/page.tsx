import Link from "next/link";

export default function Ingreso() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-white px-6 dark:bg-black">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        ¿Quién eres?
      </h1>
      <div className="flex w-full max-w-sm flex-col gap-4">
        <Link
          href="/ingreso/estudiante"
          className="rounded-xl border border-zinc-200 px-6 py-4 text-center text-lg font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          Soy estudiante
        </Link>
        <Link
          href="/ingreso/profesora"
          className="rounded-xl border border-zinc-200 px-6 py-4 text-center text-lg font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          Soy profesora
        </Link>
      </div>
    </div>
  );
}
