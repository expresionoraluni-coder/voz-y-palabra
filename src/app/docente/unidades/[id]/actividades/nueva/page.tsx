"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type TipoActividad = { id: string; nombre: string; descripcion: string | null };

export default function NuevaActividad({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: unidadId } = use(params);
  const router = useRouter();

  const [tipos, setTipos] = useState<TipoActividad[]>([]);
  const [tipoId, setTipoId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [instrucciones, setInstrucciones] = useState("");
  const [pregunta, setPregunta] = useState("");
  const [opciones, setOpciones] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("tipos_actividad")
      .select("id, nombre, descripcion")
      .order("nombre")
      .then(({ data }) => {
        setTipos(data ?? []);
        const opcionJustificacion = data?.find((t) => t.nombre === "opcion_justificacion");
        if (opcionJustificacion) setTipoId(opcionJustificacion.id);
      });
  }, []);

  const tipoSeleccionado = tipos.find((t) => t.id === tipoId);
  const esOpcionJustificacion = tipoSeleccionado?.nombre === "opcion_justificacion";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!esOpcionJustificacion) {
      setError("Este tipo de actividad todavía no está disponible para crear — llega en una fase próxima.");
      return;
    }

    const listaOpciones = opciones
      .split("\n")
      .map((o) => o.trim())
      .filter((o) => o.length > 0);

    if (listaOpciones.length < 2) {
      setError("Escribe al menos 2 opciones, una por línea.");
      return;
    }

    setCargando(true);
    const supabase = createClient();

    const { count } = await supabase
      .from("actividades")
      .select("id", { count: "exact", head: true })
      .eq("unidad_id", unidadId);

    const { error: insertError } = await supabase.from("actividades").insert({
      unidad_id: unidadId,
      tipo_id: tipoId,
      titulo,
      instrucciones,
      contenido: { pregunta, opciones: listaOpciones },
      orden: (count ?? 0) + 1,
    });

    if (insertError) {
      setError(insertError.message);
      setCargando(false);
      return;
    }

    router.push(`/docente/unidades/${unidadId}`);
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 bg-white px-6 py-10 dark:bg-black">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Crear actividad
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">Tipo</label>
          <select
            value={tipoId}
            onChange={(e) => setTipoId(e.target.value)}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
          {!esOpcionJustificacion && tipoId && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Este tipo estará disponible en una fase próxima. Por ahora solo se
              puede crear "opcion_justificacion".
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">Título</label>
          <input
            required
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">
            Instrucciones
          </label>
          <textarea
            value={instrucciones}
            onChange={(e) => setInstrucciones(e.target.value)}
            rows={2}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        {esOpcionJustificacion && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">
                Pregunta
              </label>
              <input
                required
                value={pregunta}
                onChange={(e) => setPregunta(e.target.value)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">
                Opciones (una por línea)
              </label>
              <textarea
                required
                value={opciones}
                onChange={(e) => setOpciones(e.target.value)}
                rows={4}
                placeholder={"Nivel coloquial\nNivel técnico-científico\nNivel literario"}
                className="rounded-lg border border-zinc-300 px-4 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={cargando}
          className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {cargando ? "Creando..." : "Crear actividad"}
        </button>
      </form>
    </div>
  );
}
