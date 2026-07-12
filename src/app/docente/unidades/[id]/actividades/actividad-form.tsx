"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ListTree,
  MessageSquareText,
  ScanSearch,
  Columns3,
  PenLine,
  Tags,
  Workflow,
  Mic,
  LucideIcon,
  Plus,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Field, Label, HelpText, Input, Textarea, Select } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Alert from "@/components/ui/alert";

type TipoActividad = { id: string; nombre: string; descripcion: string | null };

type FilaAsignacion = { texto: string; categoria: string };

type ActividadInicial = {
  id: string;
  tipoNombre: string;
  titulo: string;
  instrucciones: string;
  contenido: Record<string, unknown>;
};

const TIPOS_DISPONIBLES = [
  "opcion_justificacion",
  "clasificacion",
  "encontrar_corregir",
  "comparador",
  "redaccion_checklist",
  "etiquetado_texto",
  "constructor_ramificado",
  "grabacion_rubrica",
];

const ICONO_TIPO: Record<string, LucideIcon> = {
  opcion_justificacion: MessageSquareText,
  clasificacion: ListTree,
  encontrar_corregir: ScanSearch,
  comparador: Columns3,
  redaccion_checklist: PenLine,
  etiquetado_texto: Tags,
  constructor_ramificado: Workflow,
  grabacion_rubrica: Mic,
};

function lineas(texto: string): string[] {
  return texto
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function claveBorrador(unidadId: string) {
  return `voz-y-palabra:borrador-actividad:${unidadId}`;
}

/**
 * Un salto de línea de más (pegar desde Word, un Enter por accidente) parte
 * un elemento en dos sin avisar. Mostrar cada línea detectada como chip
 * hace ese error visible antes de guardar, en vez de descubrirlo después.
 */
function ContadorLineas({ texto, singular, plural }: { texto: string; singular: string; plural: string }) {
  const items = lineas(texto);
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
      <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
        {items.length} {items.length === 1 ? singular : plural}:
      </span>
      {items.map((item, i) => (
        <Badge key={i} tono="neutral">
          {item}
        </Badge>
      ))}
    </div>
  );
}

export default function ActividadForm({
  unidadId,
  actividadInicial,
}: {
  unidadId: string;
  actividadInicial?: ActividadInicial;
}) {
  const router = useRouter();
  const modoEdicion = !!actividadInicial;
  const c = (actividadInicial?.contenido ?? {}) as Record<string, any>;

  const [tipos, setTipos] = useState<TipoActividad[]>([]);
  const [tipoId, setTipoId] = useState("");
  const [titulo, setTitulo] = useState(actividadInicial?.titulo ?? "");
  const [instrucciones, setInstrucciones] = useState(actividadInicial?.instrucciones ?? "");

  const [pregunta, setPregunta] = useState(c.pregunta ?? "");
  const [opciones, setOpciones] = useState((c.opciones ?? []).join("\n"));
  const [ideasClave, setIdeasClave] = useState((c.ideas_clave ?? []).join("\n"));

  const [categorias, setCategorias] = useState((c.categorias ?? []).join("\n"));
  const [elementosFilas, setElementosFilas] = useState<FilaAsignacion[]>(
    c.elementos?.length
      ? c.elementos.map((el: { texto: string; categoria_correcta: string }) => ({
          texto: el.texto,
          categoria: el.categoria_correcta,
        }))
      : [{ texto: "", categoria: "" }],
  );

  const [textoOriginal, setTextoOriginal] = useState(c.texto_original ?? "");
  const [pista, setPista] = useState(c.pista ?? "");
  const [fragmentoErroneo, setFragmentoErroneo] = useState(c.fragmento_erroneo ?? "");
  const [ideasClaveError, setIdeasClaveError] = useState((c.ideas_clave ?? []).join("\n"));

  const [conceptos, setConceptos] = useState((c.conceptos ?? []).join("\n"));
  const [criterios, setCriterios] = useState((c.criterios ?? []).join("\n"));

  const [textoFuente, setTextoFuente] = useState(c.texto_fuente ?? "");
  const [limitePalabras, setLimitePalabras] = useState(String(c.limite_palabras ?? "80"));
  const [checklist, setChecklist] = useState((c.checklist ?? []).join("\n"));

  const [contexto, setContexto] = useState(c.contexto ?? "");
  const [etiquetas, setEtiquetas] = useState((c.etiquetas ?? []).join("\n"));
  const [fragmentosFilas, setFragmentosFilas] = useState<FilaAsignacion[]>(
    c.fragmentos?.length
      ? c.fragmentos.map((f: { texto: string; etiqueta_correcta: string }) => ({
          texto: f.texto,
          categoria: f.etiqueta_correcta,
        }))
      : [{ texto: "", categoria: "" }],
  );

  const [temaSugerido, setTemaSugerido] = useState(c.tema_sugerido ?? "");
  const [secciones, setSecciones] = useState(
    (c.secciones ?? []).map((s: { nombre: string; guia: string }) => `${s.nombre} || ${s.guia}`).join("\n"),
  );

  const [temaGrabacion, setTemaGrabacion] = useState(c.tema_sugerido ?? "");
  const [duracionSugerida, setDuracionSugerida] = useState(String(c.duracion_sugerida_segundos ?? "90"));
  const [rubrica, setRubrica] = useState((c.rubrica ?? []).join("\n"));

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [borradorRestaurado, setBorradorRestaurado] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("tipos_actividad")
      .select("id, nombre, descripcion")
      .order("nombre")
      .then(({ data }) => {
        setTipos(data ?? []);
        if (actividadInicial) {
          const actual = data?.find((t) => t.nombre === actividadInicial.tipoNombre);
          if (actual) setTipoId(actual.id);
        } else {
          const primero = data?.find((t) => t.nombre === "opcion_justificacion");
          if (primero) setTipoId(primero.id);
        }
      });
  }, [actividadInicial]);

  // Borrador: solo en modo creación — se restaura una vez al montar y se
  // guarda en cada cambio; se limpia al guardar con éxito.
  useEffect(() => {
    if (modoEdicion) return;
    const guardado = localStorage.getItem(claveBorrador(unidadId));
    if (!guardado) return;
    try {
      const datos = JSON.parse(guardado);
      if (datos.titulo) setTitulo(datos.titulo);
      if (datos.instrucciones) setInstrucciones(datos.instrucciones);
      if (datos.pregunta) setPregunta(datos.pregunta);
      if (datos.opciones) setOpciones(datos.opciones);
      if (datos.categorias) setCategorias(datos.categorias);
      if (datos.elementosFilas) setElementosFilas(datos.elementosFilas);
      if (datos.textoOriginal) setTextoOriginal(datos.textoOriginal);
      if (datos.conceptos) setConceptos(datos.conceptos);
      if (datos.criterios) setCriterios(datos.criterios);
      if (datos.textoFuente) setTextoFuente(datos.textoFuente);
      if (datos.checklist) setChecklist(datos.checklist);
      if (datos.etiquetas) setEtiquetas(datos.etiquetas);
      if (datos.fragmentosFilas) setFragmentosFilas(datos.fragmentosFilas);
      if (datos.secciones) setSecciones(datos.secciones);
      if (datos.temaGrabacion) setTemaGrabacion(datos.temaGrabacion);
      if (datos.rubrica) setRubrica(datos.rubrica);
      setBorradorRestaurado(true);
      // eslint-disable-next-line no-empty
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (modoEdicion) return;
    const datos = {
      titulo,
      instrucciones,
      pregunta,
      opciones,
      categorias,
      elementosFilas,
      textoOriginal,
      conceptos,
      criterios,
      textoFuente,
      checklist,
      etiquetas,
      fragmentosFilas,
      secciones,
      temaGrabacion,
      rubrica,
    };
    localStorage.setItem(claveBorrador(unidadId), JSON.stringify(datos));
  }, [
    modoEdicion,
    unidadId,
    titulo,
    instrucciones,
    pregunta,
    opciones,
    categorias,
    elementosFilas,
    textoOriginal,
    conceptos,
    criterios,
    textoFuente,
    checklist,
    etiquetas,
    fragmentosFilas,
    secciones,
    temaGrabacion,
    rubrica,
  ]);

  const tipoSeleccionado = tipos.find((t) => t.id === tipoId);
  const nombreTipo = tipoSeleccionado?.nombre;
  const disponible = TIPOS_DISPONIBLES.includes(nombreTipo ?? "");
  const IconoTipo = ICONO_TIPO[nombreTipo ?? ""] ?? MessageSquareText;
  const listaCategorias = lineas(categorias);
  const listaEtiquetas = lineas(etiquetas);

  function actualizarFila(
    filas: FilaAsignacion[],
    set: (f: FilaAsignacion[]) => void,
    i: number,
    cambios: Partial<FilaAsignacion>,
  ) {
    set(filas.map((f, idx) => (idx === i ? { ...f, ...cambios } : f)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let contenido: Record<string, unknown> | null = null;

    if (nombreTipo === "opcion_justificacion") {
      const listaOpciones = lineas(opciones);
      if (listaOpciones.length < 2) {
        setError("Escribe al menos 2 opciones, una por línea.");
        return;
      }
      const listaIdeasClave = lineas(ideasClave);
      contenido = {
        pregunta,
        opciones: listaOpciones,
        ideas_clave: listaIdeasClave.length > 0 ? listaIdeasClave : undefined,
      };
    } else if (nombreTipo === "clasificacion") {
      if (listaCategorias.length < 2) {
        setError("Escribe al menos 2 categorías, una por línea.");
        return;
      }
      const listaElementos = elementosFilas.filter((f) => f.texto.trim());
      const invalido = listaElementos.find((f) => !f.categoria || !listaCategorias.includes(f.categoria));
      if (listaElementos.length === 0 || invalido) {
        setError("Cada elemento necesita texto y una categoría elegida de la lista de arriba.");
        return;
      }
      contenido = {
        categorias: listaCategorias,
        elementos: listaElementos.map((f) => ({ texto: f.texto.trim(), categoria_correcta: f.categoria })),
      };
    } else if (nombreTipo === "encontrar_corregir") {
      if (!textoOriginal.trim()) {
        setError("Escribe el texto que contiene el error.");
        return;
      }
      const listaIdeasClaveError = lineas(ideasClaveError);
      contenido = {
        texto_original: textoOriginal,
        pista: pista || null,
        fragmento_erroneo: fragmentoErroneo.trim() || undefined,
        ideas_clave: listaIdeasClaveError.length > 0 ? listaIdeasClaveError : undefined,
      };
    } else if (nombreTipo === "comparador") {
      const listaConceptos = lineas(conceptos);
      const listaCriterios = lineas(criterios);
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
      const listaChecklist = lineas(checklist);
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
      if (listaEtiquetas.length < 2) {
        setError("Escribe al menos 2 etiquetas, una por línea.");
        return;
      }
      const listaFragmentos = fragmentosFilas.filter((f) => f.texto.trim());
      const invalido = listaFragmentos.find((f) => !f.categoria || !listaEtiquetas.includes(f.categoria));
      if (listaFragmentos.length === 0 || invalido) {
        setError("Cada fragmento necesita texto y una etiqueta elegida de la lista de arriba.");
        return;
      }
      contenido = {
        contexto: contexto || null,
        etiquetas: listaEtiquetas,
        fragmentos: listaFragmentos.map((f) => ({ texto: f.texto.trim(), etiqueta_correcta: f.categoria })),
      };
    } else if (nombreTipo === "constructor_ramificado") {
      const listaSecciones = lineas(secciones).map((linea) => {
        const [nombre, guia] = linea.split("||").map((p) => p.trim());
        return { nombre, guia: guia || "" };
      });
      if (listaSecciones.length < 2) {
        setError('Escribe al menos 2 secciones, formato: "nombre || guía", una por línea.');
        return;
      }
      contenido = { tema_sugerido: temaSugerido || null, secciones: listaSecciones };
    } else if (nombreTipo === "grabacion_rubrica") {
      const listaRubrica = lineas(rubrica);
      const duracion = parseInt(duracionSugerida, 10);
      if (!temaGrabacion.trim()) {
        setError("Escribe el tema o instrucción para la grabación.");
        return;
      }
      if (listaRubrica.length < 2) {
        setError("Escribe al menos 2 criterios de la rúbrica, uno por línea.");
        return;
      }
      contenido = {
        tema_sugerido: temaGrabacion,
        duracion_sugerida_segundos: duracion || 90,
        rubrica: listaRubrica,
      };
    } else {
      setError("Este tipo de actividad todavía no está disponible para crear.");
      return;
    }

    setCargando(true);
    const supabase = createClient();

    if (modoEdicion) {
      const { error: updateError } = await supabase
        .from("actividades")
        .update({ titulo, instrucciones, contenido })
        .eq("id", actividadInicial!.id);
      if (updateError) {
        setError(updateError.message);
        setCargando(false);
        return;
      }
    } else {
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
      localStorage.removeItem(claveBorrador(unidadId));
    }

    router.push(`/docente/unidades/${unidadId}`);
    router.refresh();
  }

  function filaEditor(
    filas: FilaAsignacion[],
    set: (f: FilaAsignacion[]) => void,
    opcionesCategoria: string[],
    etiquetaCategoria: string,
  ) {
    return (
      <div className="flex flex-col gap-2">
        {filas.map((fila, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={fila.texto}
              onChange={(e) => actualizarFila(filas, set, i, { texto: e.target.value })}
              placeholder="Texto del elemento"
              className="flex-1"
            />
            <Select
              value={fila.categoria}
              onChange={(e) => actualizarFila(filas, set, i, { categoria: e.target.value })}
              className="w-40 shrink-0"
              disabled={opcionesCategoria.length === 0}
            >
              <option value="">{etiquetaCategoria}</option>
              {opcionesCategoria.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </Select>
            <button
              type="button"
              onClick={() => set(filas.filter((_, idx) => idx !== i))}
              disabled={filas.length <= 1}
              aria-label="Quitar fila"
              className="shrink-0 text-slate-400 hover:text-red-500 disabled:opacity-30 dark:text-slate-500 dark:hover:text-red-400"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
        <Boton
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => set([...filas, { texto: "", categoria: "" }])}
          className="self-start"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Agregar elemento
        </Boton>
      </div>
    );
  }

  function vistaPrevia(filas: FilaAsignacion[]) {
    const listas = filas.filter((f) => f.texto.trim() && f.categoria);
    if (listas.length === 0) return null;
    return (
      <div className="flex flex-col gap-1.5 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Vista previa
        </p>
        <div className="flex flex-col gap-1.5">
          {listas.map((f, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-slate-700 dark:text-slate-300">{f.texto}</span>
              <Badge tono="indigo">{f.categoria}</Badge>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <PageHeader
        volverHref={`/docente/unidades/${unidadId}`}
        eyebrow={modoEdicion ? "Editar actividad" : "Nueva actividad"}
        titulo={modoEdicion ? actividadInicial!.titulo : "Crear actividad"}
      />

      {borradorRestaurado && (
        <Alert tono="info">Recuperamos el borrador que estabas escribiendo.</Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4 p-5">
          <Field>
            <Label htmlFor="tipo">Tipo de actividad</Label>
            <Select id="tipo" value={tipoId} onChange={(e) => setTipoId(e.target.value)} disabled={modoEdicion}>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </Select>
            {modoEdicion && (
              <HelpText>El tipo no se puede cambiar una vez creada la actividad.</HelpText>
            )}
            {!disponible && tipoId && (
              <HelpText>
                Este tipo estará disponible en una fase próxima. Por ahora puedes crear
                &quot;opcion_justificacion&quot;, &quot;clasificacion&quot;, &quot;encontrar_corregir&quot;,
                &quot;comparador&quot;, &quot;redaccion_checklist&quot;, &quot;etiquetado_texto&quot;,
                &quot;constructor_ramificado&quot; o &quot;grabacion_rubrica&quot;.
              </HelpText>
            )}
          </Field>

          <Field>
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" required value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </Field>

          <Field>
            <Label htmlFor="instrucciones">Instrucciones</Label>
            <Textarea
              id="instrucciones"
              value={instrucciones}
              onChange={(e) => setInstrucciones(e.target.value)}
              rows={2}
            />
          </Field>
        </Card>

        {disponible && (
          <Card className="flex flex-col gap-4 p-5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                <IconoTipo className="size-4" aria-hidden="true" />
              </div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Contenido — {nombreTipo?.replaceAll("_", " ")}
              </h2>
            </div>

            {nombreTipo === "opcion_justificacion" && (
              <>
                <Field>
                  <Label htmlFor="pregunta">Pregunta</Label>
                  <Input id="pregunta" required value={pregunta} onChange={(e) => setPregunta(e.target.value)} />
                </Field>
                <Field>
                  <Label htmlFor="opciones">Opciones (una por línea)</Label>
                  <Textarea
                    id="opciones"
                    required
                    value={opciones}
                    onChange={(e) => setOpciones(e.target.value)}
                    rows={4}
                    placeholder={"Nivel coloquial\nNivel técnico-científico\nNivel literario"}
                    className="font-mono text-sm"
                  />
                  <ContadorLineas texto={opciones} singular="opción" plural="opciones" />
                </Field>
                <Field>
                  <Label htmlFor="ideasClave">
                    Ideas clave esperadas en la justificación (opcional, una por línea)
                  </Label>
                  <Textarea
                    id="ideasClave"
                    value={ideasClave}
                    onChange={(e) => setIdeasClave(e.target.value)}
                    rows={3}
                    placeholder={"terminología\nespecializado\nformal"}
                    className="font-mono text-sm"
                  />
                  <HelpText>
                    Mientras el estudiante escribe, le avisamos si su justificación menciona estas ideas —
                    no bloquea el envío, solo lo invita a ampliar.
                  </HelpText>
                </Field>
              </>
            )}

            {nombreTipo === "clasificacion" && (
              <>
                <Field>
                  <Label htmlFor="categorias">Categorías (una por línea)</Label>
                  <Textarea
                    id="categorias"
                    required
                    value={categorias}
                    onChange={(e) => setCategorias(e.target.value)}
                    rows={3}
                    placeholder={"Emisor\nReceptor\nMensaje"}
                    className="font-mono text-sm"
                  />
                  <ContadorLineas texto={categorias} singular="categoría" plural="categorías" />
                </Field>
                <Field>
                  <Label>Elementos a clasificar</Label>
                  <HelpText>
                    Escribe primero las categorías de arriba — aquí eliges la correcta para cada elemento
                    de una lista, sin escribirla a mano.
                  </HelpText>
                  {filaEditor(elementosFilas, setElementosFilas, listaCategorias, "Elige categoría")}
                </Field>
                {vistaPrevia(elementosFilas)}
              </>
            )}

            {nombreTipo === "encontrar_corregir" && (
              <>
                <Field>
                  <Label htmlFor="textoOriginal">Texto con el error (el estudiante lo verá tal cual)</Label>
                  <Textarea
                    id="textoOriginal"
                    required
                    value={textoOriginal}
                    onChange={(e) => setTextoOriginal(e.target.value)}
                    rows={5}
                  />
                </Field>
                <Field>
                  <Label htmlFor="pista">Pista (opcional, se muestra si el estudiante la pide)</Label>
                  <Input id="pista" value={pista} onChange={(e) => setPista(e.target.value)} />
                </Field>
                <Field>
                  <Label htmlFor="fragmentoErroneo">
                    Fragmento exacto con el error (opcional — solo si el error es puntual, ej. una palabra
                    mal escrita)
                  </Label>
                  <Input
                    id="fragmentoErroneo"
                    value={fragmentoErroneo}
                    onChange={(e) => setFragmentoErroneo(e.target.value)}
                    placeholder="ej. aiga"
                  />
                  <HelpText>
                    Le avisamos al estudiante si "qué encontraste" menciona este fragmento — no bloquea el
                    envío, solo confirma que va por buen camino.
                  </HelpText>
                </Field>
                <Field>
                  <Label htmlFor="ideasClaveError">
                    Ideas clave esperadas (opcional — úsalo en vez del fragmento si el error es de
                    estructura/coherencia, no una palabra puntual)
                  </Label>
                  <Textarea
                    id="ideasClaveError"
                    value={ideasClaveError}
                    onChange={(e) => setIdeasClaveError(e.target.value)}
                    rows={2}
                    placeholder={"tema\nrelación\ndistintos"}
                    className="font-mono text-sm"
                  />
                </Field>
              </>
            )}

            {nombreTipo === "comparador" && (
              <>
                <Field>
                  <Label htmlFor="conceptos">Conceptos a comparar (uno por línea)</Label>
                  <Textarea
                    id="conceptos"
                    required
                    value={conceptos}
                    onChange={(e) => setConceptos(e.target.value)}
                    rows={3}
                    placeholder={"Comunicación\nLenguaje\nLengua\nHabla"}
                    className="font-mono text-sm"
                  />
                  <ContadorLineas texto={conceptos} singular="concepto" plural="conceptos" />
                </Field>
                <Field>
                  <Label htmlFor="criterios">Criterios de comparación (uno por línea)</Label>
                  <Textarea
                    id="criterios"
                    required
                    value={criterios}
                    onChange={(e) => setCriterios(e.target.value)}
                    rows={3}
                    placeholder={"¿Es exclusivo del ser humano?\n¿Es individual o social?"}
                    className="font-mono text-sm"
                  />
                  <ContadorLineas texto={criterios} singular="criterio" plural="criterios" />
                </Field>
              </>
            )}

            {nombreTipo === "redaccion_checklist" && (
              <>
                <Field>
                  <Label htmlFor="textoFuente">Texto fuente (opcional — el estudiante lo leerá antes de escribir)</Label>
                  <Textarea
                    id="textoFuente"
                    value={textoFuente}
                    onChange={(e) => setTextoFuente(e.target.value)}
                    rows={5}
                  />
                </Field>
                <Field>
                  <Label htmlFor="limitePalabras">Límite de palabras</Label>
                  <Input
                    id="limitePalabras"
                    required
                    type="number"
                    min={1}
                    value={limitePalabras}
                    onChange={(e) => setLimitePalabras(e.target.value)}
                  />
                </Field>
                <Field>
                  <Label htmlFor="checklist">Checklist de autorrevisión (uno por línea)</Label>
                  <Textarea
                    id="checklist"
                    required
                    value={checklist}
                    onChange={(e) => setChecklist(e.target.value)}
                    rows={3}
                    placeholder={"Conservé la idea central\nEliminé ejemplos secundarios\nUsé mis propias palabras"}
                    className="font-mono text-sm"
                  />
                  <ContadorLineas texto={checklist} singular="punto" plural="puntos" />
                </Field>
              </>
            )}

            {nombreTipo === "etiquetado_texto" && (
              <>
                <Field>
                  <Label htmlFor="contexto">Contexto (opcional — introduce la fuente, ej. &quot;canción&quot;, &quot;diálogo&quot;)</Label>
                  <Input id="contexto" value={contexto} onChange={(e) => setContexto(e.target.value)} />
                </Field>
                <Field>
                  <Label htmlFor="etiquetas">Etiquetas (una por línea)</Label>
                  <Textarea
                    id="etiquetas"
                    required
                    value={etiquetas}
                    onChange={(e) => setEtiquetas(e.target.value)}
                    rows={3}
                    placeholder={"Caló\nJerga\nRegionalismo\nModismo"}
                    className="font-mono text-sm"
                  />
                  <ContadorLineas texto={etiquetas} singular="etiqueta" plural="etiquetas" />
                </Field>
                <Field>
                  <Label>Fragmentos a etiquetar</Label>
                  <HelpText>
                    Escribe primero las etiquetas de arriba — aquí eliges la correcta para cada fragmento
                    de una lista, sin escribirla a mano.
                  </HelpText>
                  {filaEditor(fragmentosFilas, setFragmentosFilas, listaEtiquetas, "Elige etiqueta")}
                </Field>
                {vistaPrevia(fragmentosFilas)}
              </>
            )}

            {nombreTipo === "constructor_ramificado" && (
              <>
                <Field>
                  <Label htmlFor="temaSugerido">Tema sugerido (opcional)</Label>
                  <Textarea
                    id="temaSugerido"
                    value={temaSugerido}
                    onChange={(e) => setTemaSugerido(e.target.value)}
                    rows={2}
                  />
                </Field>
                <Field>
                  <Label htmlFor="secciones">Secciones del esqueleto — formato: nombre || guía para el estudiante</Label>
                  <Textarea
                    id="secciones"
                    required
                    value={secciones}
                    onChange={(e) => setSecciones(e.target.value)}
                    rows={5}
                    placeholder={
                      "Tesis || Plantea una postura objetiva a favor de una idea\nAntítesis || Plantea la idea opuesta, también fundamentada\nSíntesis || Integra lo mejor de ambas y concluye"
                    }
                    className="font-mono text-sm"
                  />
                </Field>
              </>
            )}

            {nombreTipo === "grabacion_rubrica" && (
              <>
                <Field>
                  <Label htmlFor="temaGrabacion">Tema o instrucción para la grabación</Label>
                  <Textarea
                    id="temaGrabacion"
                    required
                    value={temaGrabacion}
                    onChange={(e) => setTemaGrabacion(e.target.value)}
                    rows={3}
                  />
                </Field>
                <Field>
                  <Label htmlFor="duracionSugerida">Duración sugerida (segundos)</Label>
                  <Input
                    id="duracionSugerida"
                    required
                    type="number"
                    min={10}
                    value={duracionSugerida}
                    onChange={(e) => setDuracionSugerida(e.target.value)}
                  />
                </Field>
                <Field>
                  <Label htmlFor="rubrica">Criterios de la rúbrica (uno por línea)</Label>
                  <Textarea
                    id="rubrica"
                    required
                    value={rubrica}
                    onChange={(e) => setRubrica(e.target.value)}
                    rows={4}
                    placeholder={"Claridad\nRitmo\nMuletillas\nVolumen"}
                    className="font-mono text-sm"
                  />
                  <ContadorLineas texto={rubrica} singular="criterio" plural="criterios" />
                </Field>
              </>
            )}
          </Card>
        )}

        {error && <Alert tono="error">{error}</Alert>}

        <Boton type="submit" disabled={cargando} cargando={cargando} className="self-start">
          {cargando ? "Guardando..." : modoEdicion ? "Guardar cambios" : "Crear actividad"}
        </Boton>
      </form>
    </div>
  );
}
