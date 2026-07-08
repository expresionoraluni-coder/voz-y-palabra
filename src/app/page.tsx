import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("unidades").select("id");
  const count = data?.length ?? 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center dark:bg-black">
      <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
        Voz y Palabra
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Expresión Oral y Escrita I · cimientos del proyecto en construcción
      </p>
      <p className="rounded-full border border-zinc-200 px-4 py-2 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        {error
          ? "Sin conexión a la base de datos todavía"
          : `Conectado a Supabase · ${count ?? 0} unidades cargadas`}
      </p>
    </div>
  );
}
