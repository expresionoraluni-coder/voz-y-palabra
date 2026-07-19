"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, MessageSquareText, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/mensaje-error";
import { ICONO_TIPO } from "@/lib/tipo-actividad-icono";
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
  aprendizajeEsperado?: string;
  videoUrl?: string;
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
  "ordenar_fragmentos",
];

function lineas(texto: string): string[] {
  return texto
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

type SeccionParseada = { linea: string; nombre: string; guia: string; valida: boolean };

function parsearSecciones(texto: string): SeccionParseada[] {
  return lineas(texto).map((linea) => {
    const [nombre, guia] = linea.split("||").map((p) => p.trim());
    return { linea, nombre: nombre ?? "", guia: guia ?? "", valida: linea.includes("||") };
  });
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
  const [aprendizajeEsperado, setAprendizajeEsperado] = useState(actividadInicial?.aprendizajeEsperado ?? "");
  const [videoUrl, setVideoUrl] = useState(actividadInicial?.videoUrl ?? "");

  type RondaEditor = {
    contexto: string;
    pregunta: string;
    opciones: string;
    respuestaCorrecta: string;
    ideasClave: string;
  };
  const [introOJ, setIntroOJ] = useState(c.intro ?? "");
  const [rondasOJ, setRondasOJ] = useState<RondaEditor[]>(() => {
    const rondasCrudas = Array.isArray(c.rondas) && c.rondas.length > 0 ? c.rondas : c.pregunta ? [c] : [];
    if (rondasCrudas.length === 0)
      return [{ contexto: "", pregunta: "", opciones: "", respuestaCorrecta: "", ideasClave: "" }];
    return rondasCrudas.map((r: Record<string, unknown>) => ({
      contexto: (r.contexto as string) ?? "",
      pregunta: (r.pregunta as string) ?? "",
      opciones: ((r.opciones as string[]) ?? []).join("\n"),
      respuestaCorrecta: (r.respuesta_correcta as string) ?? "",
      ideasClave: ((r.ideas_clave as string[]) ?? []).join("\n"),
    }));
  });

  const [categorias, setCategorias] = useState((c.categorias ?? []).join("\n"));
  const [contextoClasificacion, setContextoClasificacion] = useState(c.contexto ?? "");
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
  const [bancoRespuestasComp, setBancoRespuestasComp] = useState((c.banco_respuestas ?? []).join("\n"));
  const [celdaCorrectaMapa, setCeldaCorrectaMapa] = useState<Record<string, string>>(() => {
    const mapa: Record<string, string> = {};
    if (Array.isArray(c.celda_correcta)) {
      c.celda_correcta.forEach((fila: string[], i: number) => {
        fila.forEach((valor, j) => {
          if (valor) mapa[`${i}-${j}`] = valor;
        });
      });
    }
    return mapa;
  });

  const [tituloFuente, setTituloFuente] = useState(c.titulo_fuente ?? "");
  const [textoFuente, setTextoFuente] = useState(c.texto_fuente ?? "");
  const [ejemplosResueltos, setEjemplosResueltos] = useState(c.ejemplos_resueltos ?? "");
  const [limitePalabras, setLimitePalabras] = useState(String(c.limite_palabras ?? "80"));
  const [modoRedaccion, setModoRedaccion] = useState<"escribir" | "leer_reflexionar">(
    c.modo === "leer_reflexionar" ? "leer_reflexionar" : "escribir",
  );
  const [ejemploResumen, setEjemploResumen] = useState(c.ejemplo_resumen ?? "");
  const [ejemploSintesis, setEjemploSintesis] = useState(c.ejemplo_sintesis ?? "");
  const [ejemploParafrasis, setEjemploParafrasis] = useState(c.ejemplo_parafrasis ?? "");
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

  const [contextoOF, setContextoOF] = useState(c.contexto ?? "");
  const [fragmentosCorrectosOF, setFragmentosCorrectosOF] = useState(
    Array.isArray(c.orden_correcto) && Array.isArray(c.fragmentos)
      ? c.orden_correcto.map((i: number) => c.fragmentos[i]).join("\n")
      : "",
  );
  const [distractoresOF, setDistractoresOF] = useState(
    Array.isArray(c.orden_correcto) && Array.isArray(c.fragmentos)
      ? c.fragmentos.filter((_: string, i: number) => !c.orden_correcto.includes(i)).join("\n")
      : "",
  );

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
      if (datos.aprendizajeEsperado) setAprendizajeEsperado(datos.aprendizajeEsperado);
      if (datos.videoUrl) setVideoUrl(datos.videoUrl);
      if (datos.introOJ) setIntroOJ(datos.introOJ);
      if (datos.rondasOJ) setRondasOJ(datos.rondasOJ);
      if (datos.categorias) setCategorias(datos.categorias);
      if (datos.contextoClasificacion) setContextoClasificacion(datos.contextoClasificacion);
      if (datos.elementosFilas) setElementosFilas(datos.elementosFilas);
      if (datos.textoOriginal) setTextoOriginal(datos.textoOriginal);
      if (datos.pista) setPista(datos.pista);
      if (datos.fragmentoErroneo) setFragmentoErroneo(datos.fragmentoErroneo);
      if (datos.ideasClaveError) setIdeasClaveError(datos.ideasClaveError);
      if (datos.conceptos) setConceptos(datos.conceptos);
      if (datos.criterios) setCriterios(datos.criterios);
      if (datos.tituloFuente) setTituloFuente(datos.tituloFuente);
      if (datos.textoFuente) setTextoFuente(datos.textoFuente);
      if (datos.ejemplosResueltos) setEjemplosResueltos(datos.ejemplosResueltos);
      if (datos.limitePalabras) setLimitePalabras(datos.limitePalabras);
      if (datos.modoRedaccion) setModoRedaccion(datos.modoRedaccion);
      if (datos.ejemploResumen) setEjemploResumen(datos.ejemploResumen);
      if (datos.ejemploSintesis) setEjemploSintesis(datos.ejemploSintesis);
      if (datos.ejemploParafrasis) setEjemploParafrasis(datos.ejemploParafrasis);
      if (datos.checklist) setChecklist(datos.checklist);
      if (datos.contexto) setContexto(datos.contexto);
      if (datos.etiquetas) setEtiquetas(datos.etiquetas);
      if (datos.fragmentosFilas) setFragmentosFilas(datos.fragmentosFilas);
      if (datos.temaSugerido) setTemaSugerido(datos.temaSugerido);
      if (datos.secciones) setSecciones(datos.secciones);
      if (datos.temaGrabacion) setTemaGrabacion(datos.temaGrabacion);
      if (datos.duracionSugerida) setDuracionSugerida(datos.duracionSugerida);
      if (datos.rubrica) setRubrica(datos.rubrica);
      if (datos.contextoOF) setContextoOF(datos.contextoOF);
      if (datos.fragmentosCorrectosOF) setFragmentosCorrectosOF(datos.fragmentosCorrectosOF);
      if (datos.distractoresOF) setDistractoresOF(datos.distractoresOF);
      if (datos.bancoRespuestasComp) setBancoRespuestasComp(datos.bancoRespuestasComp);
      if (datos.celdaCorrectaMapa) setCeldaCorrectaMapa(datos.celdaCorrectaMapa);
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
      aprendizajeEsperado,
      videoUrl,
      introOJ,
      rondasOJ,
      categorias,
      contextoClasificacion,
      elementosFilas,
      textoOriginal,
      pista,
      fragmentoErroneo,
      ideasClaveError,
      conceptos,
      criterios,
      tituloFuente,
      textoFuente,
      ejemplosResueltos,
      limitePalabras,
      modoRedaccion,
      ejemploResumen,
      ejemploSintesis,
      ejemploParafrasis,
      checklist,
      contexto,
      etiquetas,
      fragmentosFilas,
      temaSugerido,
      secciones,
      temaGrabacion,
      duracionSugerida,
      rubrica,
      contextoOF,
      fragmentosCorrectosOF,
      distractoresOF,
      bancoRespuestasComp,
      celdaCorrectaMapa,
    };
    try {
      localStorage.setItem(claveBorrador(unidadId), JSON.stringify(datos));
    } catch {
      // Safari privado o cuota llena: el borrador simplemente no se guarda.
    }
  }, [
    modoEdicion,
    unidadId,
    titulo,
    instrucciones,
    aprendizajeEsperado,
    videoUrl,
    introOJ,
    rondasOJ,
    categorias,
    contextoClasificacion,
    elementosFilas,
    textoOriginal,
    pista,
    fragmentoErroneo,
    ideasClaveError,
    conceptos,
    criterios,
    tituloFuente,
    textoFuente,
    ejemplosResueltos,
    limitePalabras,
    modoRedaccion,
    ejemploResumen,
    ejemploSintesis,
    ejemploParafrasis,
    checklist,
    contexto,
    etiquetas,
    fragmentosFilas,
    temaSugerido,
    secciones,
    temaGrabacion,
    duracionSugerida,
    rubrica,
    contextoOF,
    fragmentosCorrectosOF,
    distractoresOF,
    bancoRespuestasComp,
    celdaCorrectaMapa,
  ]);

  const tipoSeleccionado = tipos.find((t) => t.id === tipoId);
  const nombreTipo = tipoSeleccionado?.nombre;
  const disponible = TIPOS_DISPONIBLES.includes(nombreTipo ?? "");
  const IconoTipo = ICONO_TIPO[nombreTipo ?? ""] ?? MessageSquareText;
  const listaCategorias = lineas(categorias);
  const listaEtiquetas = lineas(etiquetas);
  const listaConceptosComp = lineas(conceptos);
  const listaCriteriosComp = lineas(criterios);
  const listaBancoComp = lineas(bancoRespuestasComp);

  function actualizarFila(
    filas: FilaAsignacion[],
    set: (f: FilaAsignacion[]) => void,
    i: number,
    cambios: Partial<FilaAsignacion>,
  ) {
    set(filas.map((f, idx) => (idx === i ? { ...f, ...cambios } : f)));
  }

  function actualizarRonda(i: number, cambios: Partial<RondaEditor>) {
    setRondasOJ((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...cambios } : r)));
  }

  function agregarRonda() {
    setRondasOJ((prev) => [
      ...prev,
      { contexto: "", pregunta: "", opciones: "", respuestaCorrecta: "", ideasClave: "" },
    ]);
  }

  function quitarRonda(i: number) {
    setRondasOJ((prev) => prev.filter((_, idx) => idx !== i));
  }

  function moverRonda(i: number, direccion: -1 | 1) {
    setRondasOJ((prev) => {
      const j = i + direccion;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let contenido: Record<string, unknown> | null = null;

    if (nombreTipo === "opcion_justificacion") {
      const rondasValidas: {
        contexto?: string;
        pregunta: string;
        opciones: string[];
        respuesta_correcta: string;
        ideas_clave?: string[];
      }[] = [];
      for (let i = 0; i < rondasOJ.length; i++) {
        const listaOpciones = lineas(rondasOJ[i].opciones);
        if (!rondasOJ[i].pregunta.trim() || listaOpciones.length < 2) {
          setError(`La pregunta ${i + 1} necesita texto y al menos 2 opciones.`);
          return;
        }
        if (!rondasOJ[i].respuestaCorrecta || !listaOpciones.includes(rondasOJ[i].respuestaCorrecta)) {
          setError(`Elige la respuesta correcta de la pregunta ${i + 1} (debe ser una de sus opciones).`);
          return;
        }
        const listaIdeasClave = lineas(rondasOJ[i].ideasClave);
        rondasValidas.push({
          contexto: rondasOJ[i].contexto.trim() || undefined,
          pregunta: rondasOJ[i].pregunta,
          opciones: listaOpciones,
          respuesta_correcta: rondasOJ[i].respuestaCorrecta,
          ideas_clave: listaIdeasClave.length > 0 ? listaIdeasClave : undefined,
        });
      }
      contenido = { intro: introOJ.trim() || undefined, rondas: rondasValidas };
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
        contexto: contextoClasificacion.trim() || null,
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
      if (listaBancoComp.length > 0) {
        const celdaCorrecta = listaCriterios.map((_, i) =>
          listaConceptos.map((_, j) => celdaCorrectaMapa[`${i}-${j}`] ?? ""),
        );
        if (celdaCorrecta.some((fila) => fila.some((v) => !v))) {
          setError("Elige la respuesta correcta del banco para cada celda de la cuadrícula.");
          return;
        }
        contenido = {
          conceptos: listaConceptos,
          criterios: listaCriterios,
          banco_respuestas: listaBancoComp,
          celda_correcta: celdaCorrecta,
        };
      } else {
        contenido = { conceptos: listaConceptos, criterios: listaCriterios };
      }
    } else if (nombreTipo === "redaccion_checklist" && modoRedaccion === "leer_reflexionar") {
      if (!ejemploResumen.trim() || !ejemploSintesis.trim() || !ejemploParafrasis.trim()) {
        setError("Escribe los 3 ejemplos (resumen, síntesis y paráfrasis) antes de guardar.");
        return;
      }
      contenido = {
        modo: "leer_reflexionar",
        texto_fuente: textoFuente || null,
        titulo_fuente: tituloFuente.trim() || null,
        ejemplo_resumen: ejemploResumen.trim(),
        ejemplo_sintesis: ejemploSintesis.trim(),
        ejemplo_parafrasis: ejemploParafrasis.trim(),
      };
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
        titulo_fuente: tituloFuente.trim() || null,
        ejemplos_resueltos: ejemplosResueltos.trim() || null,
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
      const seccionesParseadas = parsearSecciones(secciones);
      // Si falta el "||", antes se guardaba la sección con guia: "" en
      // silencio y el estudiante recibía un paso sin instrucciones, sin que
      // nadie se enterara — ahora se detecta antes de guardar (y se ve en
      // la vista previa de abajo mientras escribe).
      const invalida = seccionesParseadas.find((s) => !s.valida);
      if (invalida) {
        setError(`Falta el separador "||" en "${invalida.linea}" — usa el formato: nombre || guía.`);
        return;
      }
      if (seccionesParseadas.length < 2) {
        setError('Escribe al menos 2 secciones, formato: "nombre || guía", una por línea.');
        return;
      }
      contenido = {
        tema_sugerido: temaSugerido || null,
        secciones: seccionesParseadas.map((s) => ({ nombre: s.nombre, guia: s.guia })),
      };
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
    } else if (nombreTipo === "ordenar_fragmentos") {
      const correctos = lineas(fragmentosCorrectosOF);
      const distractoresLista = lineas(distractoresOF);
      if (correctos.length < 2) {
        setError("Escribe al menos 2 fragmentos en el orden correcto, uno por línea.");
        return;
      }
      // Se revuelve una sola vez al guardar (no en el navegador del
      // estudiante) para que la bolsa mezclada quede fija en el contenido
      // guardado — así todos los estudiantes ven el mismo orden revuelto.
      const combinados = [...correctos, ...distractoresLista];
      const indices = combinados.map((_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      const fragmentosMezclados = indices.map((i) => combinados[i]);
      const ordenCorrecto = correctos.map((_, origIdx) => indices.indexOf(origIdx));
      contenido = {
        contexto: contextoOF.trim() || null,
        fragmentos: fragmentosMezclados,
        orden_correcto: ordenCorrecto,
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
        .update({
          titulo,
          instrucciones,
          aprendizaje_esperado: aprendizajeEsperado.trim() || null,
          video_url: videoUrl.trim() || null,
          contenido,
        })
        .eq("id", actividadInicial!.id);
      if (updateError) {
        setError(mensajeError(updateError));
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
        aprendizaje_esperado: aprendizajeEsperado.trim() || null,
        video_url: videoUrl.trim() || null,
        contenido,
        orden: (count ?? 0) + 1,
      });
      if (insertError) {
        setError(mensajeError(insertError));
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

  function vistaPreviaSecciones(texto: string) {
    const parseadas = parsearSecciones(texto);
    if (parseadas.length === 0) return null;
    return (
      <div className="flex flex-col gap-1.5 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {parseadas.length} sección(es) detectada(s)
        </p>
        <div className="flex flex-col gap-1.5">
          {parseadas.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              {s.valida ? (
                <Badge tono="indigo">{s.nombre || "(sin nombre)"}</Badge>
              ) : (
                <Badge tono="warning">falta &quot;||&quot;</Badge>
              )}
              <span className="flex-1 text-xs text-slate-500 dark:text-slate-400">
                {s.valida ? s.guia || "(sin guía)" : s.linea}
              </span>
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
                &quot;constructor_ramificado&quot;, &quot;grabacion_rubrica&quot; u &quot;ordenar_fragmentos&quot;.
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

          <Field>
            <Label htmlFor="aprendizajeEsperado">Aprendizaje esperado (opcional)</Label>
            <Textarea
              id="aprendizajeEsperado"
              value={aprendizajeEsperado}
              onChange={(e) => setAprendizajeEsperado(e.target.value)}
              rows={2}
              placeholder="Ej. Identifica los elementos del proceso comunicativo..."
            />
            <HelpText>
              El estudiante lo ve en esta actividad, junto con la unidad de competencia de la unidad
              completa.
            </HelpText>
          </Field>

          <Field>
            <Label htmlFor="videoUrl">Video (opcional)</Label>
            <Input
              id="videoUrl"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <HelpText>
              Un link de YouTube se muestra embebido arriba de las instrucciones; cualquier otro link se
              muestra como "Ver video".
            </HelpText>
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
                  <Label htmlFor="introOJ">Introducción o escenario general (opcional)</Label>
                  <Textarea
                    id="introOJ"
                    value={introOJ}
                    onChange={(e) => setIntroOJ(e.target.value)}
                    rows={2}
                    placeholder="Ej. Es viernes por la tarde. Ana le escribe a Luis..."
                  />
                  <HelpText>
                    Se muestra una sola vez, antes de la primera pregunta — útil para un simulador o
                    escenario narrado en varios pasos.
                  </HelpText>
                </Field>

                <div className="flex flex-col gap-4">
                  {rondasOJ.map((ronda, i) => (
                    <div
                      key={i}
                      className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Pregunta {i + 1}
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moverRonda(i, -1)}
                            disabled={i === 0}
                            aria-label="Subir pregunta"
                            className="text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:text-slate-500 dark:hover:text-slate-300"
                          >
                            <ChevronUp className="size-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moverRonda(i, 1)}
                            disabled={i === rondasOJ.length - 1}
                            aria-label="Bajar pregunta"
                            className="text-slate-400 hover:text-slate-700 disabled:opacity-30 dark:text-slate-500 dark:hover:text-slate-300"
                          >
                            <ChevronDown className="size-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => quitarRonda(i)}
                            disabled={rondasOJ.length <= 1}
                            aria-label="Quitar pregunta"
                            className="text-slate-400 hover:text-red-500 disabled:opacity-30 dark:text-slate-500 dark:hover:text-red-400"
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                      <Field>
                        <Label htmlFor={`contexto-oj-${i}`}>Contexto o narrativa antes de esta pregunta (opcional)</Label>
                        <Textarea
                          id={`contexto-oj-${i}`}
                          value={ronda.contexto}
                          onChange={(e) => actualizarRonda(i, { contexto: e.target.value })}
                          rows={2}
                        />
                      </Field>
                      <Field>
                        <Label htmlFor={`pregunta-oj-${i}`}>Pregunta</Label>
                        <Input
                          id={`pregunta-oj-${i}`}
                          value={ronda.pregunta}
                          onChange={(e) => actualizarRonda(i, { pregunta: e.target.value })}
                        />
                      </Field>
                      <Field>
                        <Label htmlFor={`opciones-oj-${i}`}>Opciones (una por línea)</Label>
                        <Textarea
                          id={`opciones-oj-${i}`}
                          value={ronda.opciones}
                          onChange={(e) => actualizarRonda(i, { opciones: e.target.value })}
                          rows={4}
                          placeholder={"Nivel coloquial\nNivel técnico-científico\nNivel literario"}
                          className="font-mono text-sm"
                        />
                        <ContadorLineas texto={ronda.opciones} singular="opción" plural="opciones" />
                      </Field>
                      <Field>
                        <Label htmlFor={`respuestaCorrecta-oj-${i}`}>Respuesta correcta</Label>
                        <Select
                          id={`respuestaCorrecta-oj-${i}`}
                          value={ronda.respuestaCorrecta}
                          onChange={(e) => actualizarRonda(i, { respuestaCorrecta: e.target.value })}
                          disabled={lineas(ronda.opciones).length === 0}
                        >
                          <option value="">Elige la opción correcta</option>
                          {lineas(ronda.opciones).map((op) => (
                            <option key={op} value={op}>
                              {op}
                            </option>
                          ))}
                        </Select>
                        <HelpText>
                          El estudiante ve correcto/incorrecto al enviar — escribe primero las opciones de
                          arriba.
                        </HelpText>
                      </Field>
                      <Field>
                        <Label htmlFor={`ideasClave-oj-${i}`}>
                          Ideas clave esperadas en la justificación (opcional, una por línea)
                        </Label>
                        <Textarea
                          id={`ideasClave-oj-${i}`}
                          value={ronda.ideasClave}
                          onChange={(e) => actualizarRonda(i, { ideasClave: e.target.value })}
                          rows={2}
                          placeholder={"terminología\nespecializado\nformal"}
                          className="font-mono text-sm"
                        />
                      </Field>
                    </div>
                  ))}
                </div>
                <Boton type="button" variant="secondary" size="sm" onClick={agregarRonda} className="self-start">
                  <Plus className="size-3.5" aria-hidden="true" />
                  Agregar pregunta
                </Boton>
              </>
            )}

            {nombreTipo === "clasificacion" && (
              <>
                <Field>
                  <Label htmlFor="contextoClasificacion">
                    Párrafo o contexto (opcional — el estudiante lo ve arriba de la lista)
                  </Label>
                  <Textarea
                    id="contextoClasificacion"
                    value={contextoClasificacion}
                    onChange={(e) => setContextoClasificacion(e.target.value)}
                    rows={5}
                  />
                </Field>
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
                <Field>
                  <Label htmlFor="bancoRespuestasComp">
                    Banco de respuestas para arrastrar (opcional, una por línea)
                  </Label>
                  <Textarea
                    id="bancoRespuestasComp"
                    value={bancoRespuestasComp}
                    onChange={(e) => setBancoRespuestasComp(e.target.value)}
                    rows={4}
                    placeholder={
                      "Controlas tú todo el mensaje, sin depender de nadie más.\nSe reparten los temas y cada quien profundiza en su parte."
                    }
                    className="font-mono text-sm"
                  />
                  <ContadorLineas texto={bancoRespuestasComp} singular="respuesta" plural="respuestas" />
                  <HelpText>
                    Si dejas esto vacío, el estudiante escribe libremente en cada celda (sin
                    calificación automática, como antes). Si lo llenas, cada celda se vuelve un
                    espacio para arrastrar la respuesta correcta y la actividad se autocalifica —
                    puedes agregar más respuestas de las que caben en la cuadrícula, como señuelo.
                  </HelpText>
                </Field>
                {listaBancoComp.length > 0 && listaConceptosComp.length > 0 && listaCriteriosComp.length > 0 && (
                  <Field>
                    <Label>Respuesta correcta por celda</Label>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/60">
                            <th className="p-2 text-left"></th>
                            {listaConceptosComp.map((c) => (
                              <th
                                key={c}
                                className="border-l border-slate-200 p-2 text-left text-xs font-medium text-slate-700 dark:border-slate-800 dark:text-slate-300"
                              >
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {listaCriteriosComp.map((criterio, i) => (
                            <tr key={i} className="border-t border-slate-200 dark:border-slate-800">
                              <th
                                scope="row"
                                className="w-1/4 p-2 text-left align-top text-xs font-medium text-slate-500 dark:text-slate-500"
                              >
                                {criterio}
                              </th>
                              {listaConceptosComp.map((_, j) => (
                                <td key={j} className="border-l border-slate-200 p-1.5 dark:border-slate-800">
                                  <Select
                                    value={celdaCorrectaMapa[`${i}-${j}`] ?? ""}
                                    onChange={(e) =>
                                      setCeldaCorrectaMapa((prev) => ({ ...prev, [`${i}-${j}`]: e.target.value }))
                                    }
                                  >
                                    <option value="">Elige respuesta</option>
                                    {listaBancoComp.map((chip) => (
                                      <option key={chip} value={chip}>
                                        {chip}
                                      </option>
                                    ))}
                                  </Select>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Field>
                )}
              </>
            )}

            {nombreTipo === "redaccion_checklist" && (
              <>
                <Field>
                  <Label htmlFor="modoRedaccion">Modo</Label>
                  <Select
                    id="modoRedaccion"
                    value={modoRedaccion}
                    onChange={(e) => setModoRedaccion(e.target.value as "escribir" | "leer_reflexionar")}
                  >
                    <option value="escribir">Escribir (redacta con límite y checklist)</option>
                    <option value="leer_reflexionar">Leer y reflexionar (sin redactar)</option>
                  </Select>
                  <HelpText>
                    En "Leer y reflexionar" el estudiante no escribe nada — solo compara 3 ejemplos ya
                    resueltos (resumen, síntesis y paráfrasis) y responde una reflexión sobre las
                    diferencias.
                  </HelpText>
                </Field>
                <Field>
                  <Label htmlFor="tituloFuente">Título del texto fuente (opcional)</Label>
                  <Input id="tituloFuente" value={tituloFuente} onChange={(e) => setTituloFuente(e.target.value)} />
                </Field>
                <Field>
                  <Label htmlFor="textoFuente">
                    Texto fuente (opcional — el estudiante lo leerá antes{" "}
                    {modoRedaccion === "escribir" ? "de escribir" : "de comparar los ejemplos"})
                  </Label>
                  <Textarea
                    id="textoFuente"
                    value={textoFuente}
                    onChange={(e) => setTextoFuente(e.target.value)}
                    rows={5}
                  />
                </Field>

                {modoRedaccion === "leer_reflexionar" ? (
                  <>
                    <Field>
                      <Label htmlFor="ejemploResumen">Ejemplo de resumen</Label>
                      <Textarea
                        id="ejemploResumen"
                        required
                        value={ejemploResumen}
                        onChange={(e) => setEjemploResumen(e.target.value)}
                        rows={5}
                      />
                    </Field>
                    <Field>
                      <Label htmlFor="ejemploSintesis">Ejemplo de síntesis</Label>
                      <Textarea
                        id="ejemploSintesis"
                        required
                        value={ejemploSintesis}
                        onChange={(e) => setEjemploSintesis(e.target.value)}
                        rows={4}
                      />
                    </Field>
                    <Field>
                      <Label htmlFor="ejemploParafrasis">Ejemplo de paráfrasis</Label>
                      <Textarea
                        id="ejemploParafrasis"
                        required
                        value={ejemploParafrasis}
                        onChange={(e) => setEjemploParafrasis(e.target.value)}
                        rows={6}
                      />
                    </Field>
                  </>
                ) : (
                  <>
                    <Field>
                      <Label htmlFor="ejemplosResueltos">
                        Ejemplos ya resueltos (opcional — resumen, síntesis y paráfrasis del mismo texto,
                        como referencia antes de escribir)
                      </Label>
                      <Textarea
                        id="ejemplosResueltos"
                        value={ejemplosResueltos}
                        onChange={(e) => setEjemplosResueltos(e.target.value)}
                        rows={8}
                      />
                      <HelpText>
                        El estudiante lo ve detrás de un botón "Ver ejemplos ya resueltos", no de entrada.
                      </HelpText>
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
                {vistaPreviaSecciones(secciones)}
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

            {nombreTipo === "ordenar_fragmentos" && (
              <>
                <Field>
                  <Label htmlFor="contextoOF">Contexto (opcional — instrucción general antes de la lista)</Label>
                  <Textarea
                    id="contextoOF"
                    value={contextoOF}
                    onChange={(e) => setContextoOF(e.target.value)}
                    rows={2}
                  />
                </Field>
                <Field>
                  <Label htmlFor="fragmentosCorrectosOF">
                    Fragmentos en el orden correcto (uno por línea)
                  </Label>
                  <Textarea
                    id="fragmentosCorrectosOF"
                    required
                    value={fragmentosCorrectosOF}
                    onChange={(e) => setFragmentosCorrectosOF(e.target.value)}
                    rows={5}
                    placeholder={
                      "La interculturalidad no consiste en que las culturas coexistan sin comunicarse...\nEste diálogo exige reconocer que ninguna cultura posee una perspectiva completa...\nPor ello, las instituciones educativas tienen la responsabilidad de..."
                    }
                    className="font-mono text-sm"
                  />
                  <ContadorLineas texto={fragmentosCorrectosOF} singular="fragmento" plural="fragmentos" />
                  <HelpText>
                    El estudiante los va a ver revueltos junto con los distractores — aquí escríbelos ya en
                    el orden en que sí tienen coherencia.
                  </HelpText>
                </Field>
                <Field>
                  <Label htmlFor="distractoresOF">Distractores (opcional, uno por línea)</Label>
                  <Textarea
                    id="distractoresOF"
                    value={distractoresOF}
                    onChange={(e) => setDistractoresOF(e.target.value)}
                    rows={3}
                    placeholder={"Cada país tiene platillos típicos que representan su identidad...\nViajar es una de las mejores formas de conocer gente nueva..."}
                    className="font-mono text-sm"
                  />
                  <ContadorLineas texto={distractoresOF} singular="distractor" plural="distractores" />
                  <HelpText>
                    Fragmentos que NO pertenecen a la secuencia — el estudiante debe dejarlos fuera.
                  </HelpText>
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
