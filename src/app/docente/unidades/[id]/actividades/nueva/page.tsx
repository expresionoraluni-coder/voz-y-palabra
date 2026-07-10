"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type TipoActividad = { id: string; nombre: string; descripcion: string | null };

const TIPOS_DISPONIBLES = [
  "opcion_justificacion",
  "clasificacion",
  "encontrar_corregir",
  "comparador",
  "redaccion_checklist",
  "etiquetado_texto",
];

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

  // opcion_justificacion
  const [pregunta, setPregunta] = useState("");
  const [opciones, setOpciones] = useState("");

  // clasificacion
  const [categorias, setCategorias] = useState("");
  const [elementos, setElementos] = useState("");

  // encontrar_corregir
  const [textoOriginal, setTextoOriginal] = useState("");
  const [pista, setPista] = useState("");

  // comparador
  const [conceptos, setConceptos] = useState("");
  const [criterios, setCriterios] = useState("");

  // redaccion_checklist
  const [textoFuente, setTextoFuente] = useState("");
  const [limitePalabras, setLimitePalabras] = useState("80");
  const [checklist, setChecklist] = useState("");

  // etiquetado_texto
  const [contexto, setContexto] = useState("");
  const [etiquetas, setEtiquetas] = useState("");
  const [fragmentos, setFragmentos] = useState("");

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
        const primero = data?.find((t) => t.nombre === "opcion_justificacion");
        if (primero) setTipoId(primero.id);
      });
  }, []);

  const tipoSeleccionado = tipos.find((t) => t.id === tipoId);
  const nombreTipo = tipoSeleccionado?.nombre;
  const disponible = TIPOS_DISPONIBLES.includes(nombreTipo ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let contenido: Record<string, unknown> | null = null;

    if (nombreTipo === "opcion_justificacion") {
      const listaOpciones = opciones
        .split("\n")
        .map((o) => o.trim())
        .filter((o) => o.length > 0);
      if (listaOpciones.length < 2) {
        setError("Escribe al menos 2 opciones, una por línea.");
        return;
      }
      contenido = { pregunta, opciones: listaOpciones };
    } else if (nombreTipo === "clasificacion") {
      const listaCategorias = categorias
        .split("\n")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      const listaElementos = elementos
        .split("\n")
        .map((linea) => linea.trim())
        .filter((linea) => linea.length > 0)
        .map((linea) => {
          const [texto, categoria] = linea.split("||").map((p) => p.trim());
          return { texto, categoria_correcta: categoria };
        });

      if (listaCategorias.length < 2) {
        setError("Escribe al menos 2 categorías, una por línea.");
        return;
      }
      const elementoInvalido = listaElementos.find(
        (el) => !el.texto || !el.categoria_correcta || !listaCategorias.includes(el.categoria_correcta),
      );
      if (listaElementos.length === 0 || elementoInvalido) {
        setError(
          'Cada elemento debe tener el formato "texto || categoría", y la categoría debe ser una de las que escribiste arriba.',
        );
        return;
      }
      contenido = { categorias: listaCategorias, elementos: listaElementos };
    } else if (nombreTipo === "encontrar_corregir") {
      if (!textoOriginal.trim()) {
        setError("Escribe el texto que contiene el error.");
        return;
      }
      contenido = { texto_original: textoOriginal, pista: pista || null };
    } else if (nombreTipo === "comparador") {
      const listaConceptos = conceptos
        .split("\n")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      const listaCriterios = criterios
        .split("\n")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      if (listaConceptos.length < 2) {
        setError("Escribe al menos 2 conceptos a comparar, uno por línea.");
        return;
      }
      if (listaCriterios.length < 1) {
        setError("Escribe al menos 1 criterio de comparación, uno por línea.");
        return;
      }
      contenido = { conceptos: listaConceptos, criterios: listaCriterios };
    } else if (nombreTipo === "redaccion_checklist") {
      const listaChecklist = checklist
        .split("\n")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      const limite = parseInt(limitePalabras, 10);
      if (!limite || limite < 1) {
        setError("Escribe un límite de palabras válido.");
        return;
      }
      if (listaChecklist.length === 0) {
        setError("Escribe al menos 1 punto de autorrevisión, uno por línea.");
        return;
      }
      contenido = {
        texto_fuente: textoFuente || null,
        limite_palabras: limite,
        checklist: listaChecklist,
      };
    } else if (nombreTipo === "etiquetado_texto") {
      const listaEtiquetas = etiquetas
        .split("\n")
        .map((e) => e.trim())
        .filter((e) => e.length > 0);
      const listaFragmentos = fragmentos
        .split("\n")
        .map((linea) => linea.trim())
        .filter((linea) => linea.length > 0)
        .map((linea) => {
          const [texto, etiqueta] = linea.split("||").map((p) => p.trim());
          return { texto, etiqueta_correcta: etiqueta };
        });

      if (listaEtiquetas.length < 2) {
        setError("Escribe al menos 2 etiquetas, una por línea.");
        return;
      }
      const fragmentoInvalido = listaFragmentos.find(
        (f) => !f.texto || !f.etiqueta_correcta || !listaEtiquetas.includes(f.etiqueta_correcta),
      );
      if (listaFragmentos.length === 0 || fragmentoInvalido) {
        setError(
          'Cada fragmento debe tener el formato "texto || etiqueta", y la etiqueta debe ser una de las que escribiste arriba.',
        );
        return;
      }
      contenido = {
        contexto: contexto || null,
        etiquetas: listaEtiquetas,
        fragmentos: listaFragmentos,
      };
    } else {
      setError("Este tipo de actividad todavía no está disponible para crear.");
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
      contenido,
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
          {!disponible && tipoId && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Este tipo estará disponible en una fase próxima. Por ahora puedes
              crear "opcion_justificacion", "clasificacion", "encontrar_corregir",
              "comparador", "redaccion_checklist" o "etiquetado_texto".
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

        {nombreTipo === "opcion_justificacion" && (
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

        {nombreTipo === "clasificacion" && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">
                Categorías (una por línea)
              </label>
              <textarea
                required
                value={categorias}
                onChange={(e) => setCategorias(e.target.value)}
                rows={3}
                placeholder={"Emisor\nReceptor\nMensaje"}
                className="rounded-lg border border-zinc-300 px-4 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">
                Elementos a clasificar — formato: texto || categoría correcta
              </label>
              <textarea
                required
                value={elementos}
                onChange={(e) => setElementos(e.target.value)}
                rows={6}
                placeholder={
                  "Quien construye y envía el mensaje || Emisor\nQuien recibe e interpreta el mensaje || Receptor"
                }
                className="rounded-lg border border-zinc-300 px-4 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>
          </>
        )}

        {nombreTipo === "encontrar_corregir" && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">
                Texto con el error (el estudiante lo verá tal cual)
              </label>
              <textarea
                required
                value={textoOriginal}
                onChange={(e) => setTextoOriginal(e.target.value)}
                rows={5}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">
                Pista (opcional, se muestra si el estudiante la pide)
              </label>
              <input
                value={pista}
                onChange={(e) => setPista(e.target.value)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>
          </>
        )}

        {nombreTipo === "comparador" && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">
                Conceptos a comparar (uno por línea)
              </label>
              <textarea
                required
                value={conceptos}
                onChange={(e) => setConceptos(e.target.value)}
                rows={3}
                placeholder={"Comunicación\nLenguaje\nLengua\nHabla"}
                className="rounded-lg border border-zinc-300 px-4 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">
                Criterios de comparación (uno por línea)
              </label>
              <textarea
                required
                value={criterios}
                onChange={(e) => setCriterios(e.target.value)}
                rows={3}
                placeholder={"¿Es exclusivo del ser humano?\n¿Es individual o social?"}
                className="rounded-lg border border-zinc-300 px-4 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>
          </>
        )}

        {nombreTipo === "redaccion_checklist" && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">
                Texto fuente (opcional — el estudiante lo leerá antes de escribir)
              </label>
              <textarea
                value={textoFuente}
                onChange={(e) => setTextoFuente(e.target.value)}
                rows={5}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">
                Límite de palabras
              </label>
              <input
                required
                type="number"
                min={1}
                value={limitePalabras}
                onChange={(e) => setLimitePalabras(e.target.value)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">
                Checklist de autorrevisión (uno por línea)
              </label>
              <textarea
                required
                value={checklist}
                onChange={(e) => setChecklist(e.target.value)}
                rows={3}
                placeholder={"Conservé la idea central\nEliminé ejemplos secundarios\nUsé mis propias palabras"}
                className="rounded-lg border border-zinc-300 px-4 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>
          </>
        )}

        {nombreTipo === "etiquetado_texto" && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">
                Contexto (opcional — introduce la fuente, ej. "canción", "diálogo")
              </label>
              <input
                value={contexto}
                onChange={(e) => setContexto(e.target.value)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">
                Etiquetas (una por línea)
              </label>
              <textarea
                required
                value={etiquetas}
                onChange={(e) => setEtiquetas(e.target.value)}
                rows={3}
                placeholder={"Caló\nJerga\nRegionalismo\nModismo"}
                className="rounded-lg border border-zinc-300 px-4 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">
                Fragmentos a etiquetar — formato: texto || etiqueta correcta
              </label>
              <textarea
                required
                value={fragmentos}
                onChange={(e) => setFragmentos(e.target.value)}
                rows={6}
                placeholder={"Ya chole chango chilango || Caló\nEl que es perico dondequiera es verde || Modismo"}
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
