"use client";

import { useEffect, useState, use } from "react";
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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Field, Label, HelpText, Input, Textarea, Select } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import Alert from "@/components/ui/alert";

type TipoActividad = { id: string; nombre: string; descripcion: string | null };

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
  const [ideasClave, setIdeasClave] = useState("");

  // clasificacion
  const [categorias, setCategorias] = useState("");
  const [elementos, setElementos] = useState("");

  // encontrar_corregir
  const [textoOriginal, setTextoOriginal] = useState("");
  const [pista, setPista] = useState("");
  const [fragmentoErroneo, setFragmentoErroneo] = useState("");
  const [ideasClaveError, setIdeasClaveError] = useState("");

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

  // constructor_ramificado
  const [temaSugerido, setTemaSugerido] = useState("");
  const [secciones, setSecciones] = useState("");

  // grabacion_rubrica
  const [temaGrabacion, setTemaGrabacion] = useState("");
  const [duracionSugerida, setDuracionSugerida] = useState("90");
  const [rubrica, setRubrica] = useState("");

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
  const IconoTipo = ICONO_TIPO[nombreTipo ?? ""] ?? MessageSquareText;

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
      const listaIdeasClave = ideasClave
        .split("\n")
        .map((i) => i.trim())
        .filter((i) => i.length > 0);
      contenido = {
        pregunta,
        opciones: listaOpciones,
        ideas_clave: listaIdeasClave.length > 0 ? listaIdeasClave : undefined,
      };
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
      const listaIdeasClaveError = ideasClaveError
        .split("\n")
        .map((i) => i.trim())
        .filter((i) => i.length > 0);
      contenido = {
        texto_original: textoOriginal,
        pista: pista || null,
        fragmento_erroneo: fragmentoErroneo.trim() || undefined,
        ideas_clave: listaIdeasClaveError.length > 0 ? listaIdeasClaveError : undefined,
      };
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
    } else if (nombreTipo === "constructor_ramificado") {
      const listaSecciones = secciones
        .split("\n")
        .map((linea) => linea.trim())
        .filter((linea) => linea.length > 0)
        .map((linea) => {
          const [nombre, guia] = linea.split("||").map((p) => p.trim());
          return { nombre, guia: guia || "" };
        });
      if (listaSecciones.length < 2) {
        setError('Escribe al menos 2 secciones, formato: "nombre || guía", una por línea.');
        return;
      }
      contenido = { tema_sugerido: temaSugerido || null, secciones: listaSecciones };
    } else if (nombreTipo === "grabacion_rubrica") {
      const listaRubrica = rubrica
        .split("\n")
        .map((r) => r.trim())
        .filter((r) => r.length > 0);
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
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <PageHeader
        volverHref={`/docente/unidades/${unidadId}`}
        eyebrow="Nueva actividad"
        titulo="Crear actividad"
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4 p-5">
          <Field>
            <Label htmlFor="tipo">Tipo de actividad</Label>
            <Select id="tipo" value={tipoId} onChange={(e) => setTipoId(e.target.value)}>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </Select>
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
                </Field>
                <Field>
                  <Label htmlFor="elementos">Elementos a clasificar — formato: texto || categoría correcta</Label>
                  <Textarea
                    id="elementos"
                    required
                    value={elementos}
                    onChange={(e) => setElementos(e.target.value)}
                    rows={6}
                    placeholder={
                      "Quien construye y envía el mensaje || Emisor\nQuien recibe e interpreta el mensaje || Receptor"
                    }
                    className="font-mono text-sm"
                  />
                </Field>
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
                </Field>
                <Field>
                  <Label htmlFor="fragmentos">Fragmentos a etiquetar — formato: texto || etiqueta correcta</Label>
                  <Textarea
                    id="fragmentos"
                    required
                    value={fragmentos}
                    onChange={(e) => setFragmentos(e.target.value)}
                    rows={6}
                    placeholder={"Ya chole chango chilango || Caló\nEl que es perico dondequiera es verde || Modismo"}
                    className="font-mono text-sm"
                  />
                </Field>
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
                </Field>
              </>
            )}
          </Card>
        )}

        {error && <Alert tono="error">{error}</Alert>}

        <Boton type="submit" disabled={cargando} cargando={cargando} className="self-start">
          {cargando ? "Creando..." : "Crear actividad"}
        </Boton>
      </form>
    </div>
  );
}
