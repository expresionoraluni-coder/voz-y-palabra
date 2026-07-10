import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 text-center dark:bg-black">
      <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
        Voz y Palabra
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Expresión Oral y Escrita I
      </p>
      <Link
        href="/ingreso"
        className="rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
      >
        Entrar
      </Link>
    </div>
  );
}
