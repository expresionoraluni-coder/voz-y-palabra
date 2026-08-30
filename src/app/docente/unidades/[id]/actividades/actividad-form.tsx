"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, MessageSquareText, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/mensaje-error";
import { DESCRIPCION_TIPO, etiquetaTipo, ICONO_TIPO } from "@/lib/tipo-actividad-icono";
import { esTipoActividadActual, TIPOS_ACTIVIDAD_ACTUALES } from "@/lib/tipos-actividad-actuales";
import { compararPalabras, tokenizar } from "@/lib/comparar-ortografia";
import { esVideoUrlPermitida } from "@/lib/video-embed";
import PageHeader from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Field, Label, HelpText, Input, Textarea, Select } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Alert from "@/components/ui/alert";
import { instruccionesMomentosDeContenido } from "@/lib/instrucciones-momentos";

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

function lineas(texto: string): string[] {
  return texto
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function claveBorrador(unidadId: string, usuarioId: string) {
  return `voz-y-palabra:borrador-actividad:${usuarioId}:${unidadId}`;
}

function claveBorradorLegacy(unidadId: string) {
  return `voz-y-palabra:borrador-actividad:${unidadId}`;
}

function barajarIndices(total: number) {
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
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
  tieneEntregas = false,
}: {
  unidadId: string;
  actividadInicial?: ActividadInicial;
  tieneEntregas?: boolean;
}) {
  const router = useRouter();
  const modoEdicion = !!actividadInicial;
  // El contenido se conserva como JSON porque cada tipo tiene una forma distinta.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = (actividadInicial?.contenido ?? {}) as Record<string, any>;
  const instruccionesIniciales = instruccionesMomentosDeContenido(c, actividadInicial?.instrucciones ?? "");

  const [tipos, setTipos] = useState<TipoActividad[]>([]);
  const [tipoId, setTipoId] = useState("");
  const [titulo, setTitulo] = useState(actividadInicial?.titulo ?? "");
  const [instrucciones, setInstrucciones] = useState(actividadInicial?.instrucciones ?? "");
  const [aprendizajeEsperado, setAprendizajeEsperado] = useState(actividadInicial?.aprendizajeEsperado ?? "");
  const [videoUrl, setVideoUrl] = useState(actividadInicial?.videoUrl ?? "");
  const [ayuda, setAyuda] = useState(typeof c._ayuda === "string" ? c._ayuda : "");
  const [instruccionPresentacion, setInstruccionPresentacion] = useState(instruccionesIniciales.presentacion);
  const [instruccionVideo, setInstruccionVideo] = useState(instruccionesIniciales.video);

  type RondaEditor = {
    contexto: string;
    pregunta: string;
    opciones: string;
    respuestaCorrecta: string;
  };
  const [introOJ, setIntroOJ] = useState(c.intro ?? "");
  const [rondasOJ, setRondasOJ] = useState<RondaEditor[]>(() => {
    const rondasCrudas = Array.isArray(c.rondas) && c.rondas.length > 0 ? c.rondas : c.pregunta ? [c] : [];
    if (rondasCrudas.length === 0)
      return [{ contexto: "", pregunta: "", opciones: "", respuestaCorrecta: "" }];
    return rondasCrudas.map((r: Record<string, unknown>) => ({
      contexto: (r.contexto as string) ?? "",
      pregunta: (r.pregunta as string) ?? "",
      opciones: ((r.opciones as string[]) ?? []).join("\n"),
      respuestaCorrecta: (r.respuesta_correcta as string) ?? "",
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

  const [introVideos, setIntroVideos] = useState(c.intro ?? "");
  const [cualidadesEV, setCualidadesEV] = useState((c.cualidades ?? []).join("\n"));
  const [videoBienUrl, setVideoBienUrl] = useState(c.video_bien?.url ?? "");
  const [videoBienPresentes, setVideoBienPresentes] = useState<string[]>(c.video_bien?.presentes ?? []);
  const [videoMalUrl, setVideoMalUrl] = useState(c.video_mal?.url ?? "");
  const [videoMalAusentes, setVideoMalAusentes] = useState<string[]>(c.video_mal?.ausentes ?? []);

  const [contextoOrtografia, setContextoOrtografia] = useState(c.contexto ?? "");
  const [textoIncorrecto, setTextoIncorrecto] = useState(c.texto_incorrecto ?? "");
  const [textoCorrecto, setTextoCorrecto] = useState(c.texto_correcto ?? "");
  const [temasOrtografia, setTemasOrtografia] = useState((c.temas ?? []).join("\n"));

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCargaTipos, setErrorCargaTipos] = useState<string | null>(null);
  const [cargandoTipos, setCargandoTipos] = useState(true);
  const [borradorRestaurado, setBorradorRestaurado] = useState(false);
  const [borradorListo, setBorradorListo] = useState(false);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [tipoBorradorNombre, setTipoBorradorNombre] = useState<string | null>(null);
  const tipoSeleccionado = tipos.find((t) => t.id === tipoId);
  const nombreTipo = tipoSeleccionado?.nombre;
  const disponible = esTipoActividadActual(nombreTipo);
  const tipoHistoricoEnEdicion = modoEdicion && Boolean(nombreTipo) && !disponible;
  const puedeGuardar = disponible || tipoHistoricoEnEdicion;
  const contenidoBloqueado = modoEdicion && tieneEntregas;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUsuarioId(data.user?.id ?? null));
    const nombresTipos = Array.from(
      new Set([
        ...TIPOS_ACTIVIDAD_ACTUALES,
        ...(actividadInicial?.tipoNombre ? [actividadInicial.tipoNombre] : []),
      ]),
    );
    supabase
      .from("tipos_actividad")
      .select("id, nombre, descripcion")
      .in("nombre", nombresTipos)
      .order("nombre")
      .then(({ data, error: tiposError }) => {
        if (tiposError) {
          setTipos([]);
          setErrorCargaTipos("No pudimos cargar los tipos de actividad. Recarga la página para intentarlo de nuevo.");
          setCargandoTipos(false);
          return;
        }
        const tiposCargados = data ?? [];
        setTipos(tiposCargados);
        const nombrePreferido = actividadInicial?.tipoNombre ?? tipoBorradorNombre;
        const actual = nombrePreferido
          ? tiposCargados.find((t) => t.nombre === nombrePreferido)
          : undefined;
        if (actividadInicial && !actual) {
          setErrorCargaTipos("No pudimos encontrar el tipo de esta actividad. No se puede editar hasta recuperar sus datos.");
        }
        if (actual) {
          setTipoId(actual.id);
        } else {
          const primero = tiposCargados.find((t) => t.nombre === TIPOS_ACTIVIDAD_ACTUALES[0]);
          if (primero) setTipoId(primero.id);
        }
        if (!actividadInicial && tiposCargados.length === 0) {
          setErrorCargaTipos("No hay tipos de actividad disponibles. Recarga la página para intentarlo de nuevo.");
        }
        setCargandoTipos(false);
      });
  }, [actividadInicial, tipoBorradorNombre]);

  // Borrador: solo en modo creación — se restaura una vez al montar y se
  // guarda en cada cambio; se limpia al guardar con éxito.
  useEffect(() => {
    if (modoEdicion || !usuarioId) return;
    // El borrador anterior no estaba ligado a una cuenta. Elimínalo para que
    // no quede disponible si otra docente usa el mismo navegador.
    localStorage.removeItem(claveBorradorLegacy(unidadId));
    const guardado = localStorage.getItem(claveBorrador(unidadId, usuarioId));
    if (!guardado) {
      setBorradorListo(true);
      return;
    }
    try {
      const datos = JSON.parse(guardado);
      if (typeof datos.tipoNombre === "string" && datos.tipoNombre) setTipoBorradorNombre(datos.tipoNombre);
      if (datos.titulo) setTitulo(datos.titulo);
      if (datos.instrucciones) setInstrucciones(datos.instrucciones);
      if (datos.aprendizajeEsperado) setAprendizajeEsperado(datos.aprendizajeEsperado);
      if (datos.videoUrl) setVideoUrl(datos.videoUrl);
      if (datos.ayuda) setAyuda(datos.ayuda);
      if (datos.instruccionPresentacion) setInstruccionPresentacion(datos.instruccionPresentacion);
      if (datos.instruccionVideo) setInstruccionVideo(datos.instruccionVideo);
      if (datos.introOJ) setIntroOJ(datos.introOJ);
      if (datos.rondasOJ) setRondasOJ(datos.rondasOJ);
      if (datos.categorias) setCategorias(datos.categorias);
      if (datos.contextoClasificacion) setContextoClasificacion(datos.contextoClasificacion);
      if (datos.elementosFilas) setElementosFilas(datos.elementosFilas);
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
      if (datos.contextoOF) setContextoOF(datos.contextoOF);
      if (datos.fragmentosCorrectosOF) setFragmentosCorrectosOF(datos.fragmentosCorrectosOF);
      if (datos.distractoresOF) setDistractoresOF(datos.distractoresOF);
      if (datos.bancoRespuestasComp) setBancoRespuestasComp(datos.bancoRespuestasComp);
      if (datos.celdaCorrectaMapa) setCeldaCorrectaMapa(datos.celdaCorrectaMapa);
      if (datos.introVideos) setIntroVideos(datos.introVideos);
      if (datos.cualidadesEV) setCualidadesEV(datos.cualidadesEV);
      if (datos.videoBienUrl) setVideoBienUrl(datos.videoBienUrl);
      if (datos.videoBienPresentes) setVideoBienPresentes(datos.videoBienPresentes);
      if (datos.videoMalUrl) setVideoMalUrl(datos.videoMalUrl);
      if (datos.videoMalAusentes) setVideoMalAusentes(datos.videoMalAusentes);
      if (datos.contextoOrtografia) setContextoOrtografia(datos.contextoOrtografia);
      if (datos.textoIncorrecto) setTextoIncorrecto(datos.textoIncorrecto);
      if (datos.textoCorrecto) setTextoCorrecto(datos.textoCorrecto);
      if (datos.temasOrtografia) setTemasOrtografia(datos.temasOrtografia);
      setBorradorRestaurado(true);
    } catch {
      // Un borrador incompleto no debe bloquear la captura de uno nuevo.
    } finally {
      setBorradorListo(true);
    }
  }, [modoEdicion, unidadId, usuarioId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (modoEdicion || !usuarioId || !borradorListo || cargandoTipos) return;
    const datos = {
      tipoNombre: nombreTipo,
      titulo,
      instrucciones,
      aprendizajeEsperado,
      videoUrl,
      ayuda,
      instruccionPresentacion,
      instruccionVideo,
      introOJ,
      rondasOJ,
      categorias,
      contextoClasificacion,
      elementosFilas,
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
      contextoOF,
      fragmentosCorrectosOF,
      distractoresOF,
      bancoRespuestasComp,
      celdaCorrectaMapa,
      introVideos,
      cualidadesEV,
      videoBienUrl,
      videoBienPresentes,
      videoMalUrl,
      videoMalAusentes,
      contextoOrtografia,
      textoIncorrecto,
      textoCorrecto,
      temasOrtografia,
    };
    try {
      localStorage.setItem(claveBorrador(unidadId, usuarioId), JSON.stringify(datos));
    } catch {
      // Safari privado o cuota llena: el borrador simplemente no se guarda.
    }
  }, [
    modoEdicion,
    unidadId,
    usuarioId,
    borradorListo,
    cargandoTipos,
    nombreTipo,
    titulo,
    instrucciones,
    aprendizajeEsperado,
    videoUrl,
    ayuda,
    instruccionPresentacion,
    instruccionVideo,
    introOJ,
    rondasOJ,
    categorias,
    contextoClasificacion,
    elementosFilas,
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
    contextoOF,
    fragmentosCorrectosOF,
    distractoresOF,
    bancoRespuestasComp,
    celdaCorrectaMapa,
    introVideos,
    cualidadesEV,
    videoBienUrl,
    videoBienPresentes,
    videoMalUrl,
    videoMalAusentes,
    contextoOrtografia,
    textoIncorrecto,
    textoCorrecto,
    temasOrtografia,
  ]);

  const IconoTipo = ICONO_TIPO[nombreTipo ?? ""] ?? MessageSquareText;
  const listaCategorias = lineas(categorias);
  const listaEtiquetas = lineas(etiquetas);
  const listaConceptosComp = lineas(conceptos);
  const listaCriteriosComp = lineas(criterios);
  const listaBancoComp = lineas(bancoRespuestasComp);
  const listaCualidadesEV = lineas(cualidadesEV);
  const listaTemasOrtografia = lineas(temasOrtografia);

  function actualizarFila(
    filas: FilaAsignacion[],
    set: (f: FilaAsignacion[]) => void,
    i: number,
    cambios: Partial<FilaAsignacion>,
  ) {
    set(filas.map((f, idx) => (idx === i ? { ...f, ...cambios } : f)));
  }

  function alternarCualidad(lista: string[], set: (v: string[]) => void, cualidad: string) {
    set(lista.includes(cualidad) ? lista.filter((c) => c !== cualidad) : [...lista, cualidad]);
  }

  function actualizarRonda(i: number, cambios: Partial<RondaEditor>) {
    setRondasOJ((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...cambios } : r)));
  }

  function agregarRonda() {
    setRondasOJ((prev) => [
      ...prev,
      { contexto: "", pregunta: "", opciones: "", respuestaCorrecta: "" },
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

  function descartarBorrador() {
    if (!usuarioId) return;
    localStorage.removeItem(claveBorrador(unidadId, usuarioId));
    localStorage.removeItem(claveBorradorLegacy(unidadId));
    window.location.reload();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cargando) return;
    setError(null);

    if (contenidoBloqueado) {
      setError("Esta actividad ya tiene entregas y su contenido está protegido para no invalidar respuestas previas.");
      return;
    }

    if (!tipoId || !nombreTipo || !puedeGuardar) {
      setError("Selecciona un tipo de actividad vigente antes de guardar.");
      return;
    }

    const tituloNormalizado = titulo.trim();
    const instruccionesNormalizadas = instrucciones.trim();
    const instruccionPresentacionNormalizada = instruccionPresentacion.trim();
    const instruccionVideoNormalizada = instruccionVideo.trim();
    const aprendizajeNormalizado = aprendizajeEsperado.trim();
    const ayudaNormalizada = ayuda.trim();
    if (!tituloNormalizado) {
      setError("Escribe un título para la actividad.");
      return;
    }
    if (tituloNormalizado.length > 160) {
      setError("El título no puede superar 160 caracteres.");
      return;
    }
    if (!instruccionesNormalizadas) {
      setError("Escribe una instrucción clara para el momento de resolver la actividad.");
      return;
    }
    if (instruccionesNormalizadas.length > 3000) {
      setError("Las instrucciones no pueden superar 3000 caracteres.");
      return;
    }
    if (!instruccionPresentacionNormalizada || !instruccionVideoNormalizada) {
      setError("Escribe las instrucciones de presentación y del video.");
      return;
    }
    if (instruccionPresentacionNormalizada.length > 1200 || instruccionVideoNormalizada.length > 1200) {
      setError("Las instrucciones de presentación y del video no pueden superar 1200 caracteres cada una.");
      return;
    }
    if (aprendizajeNormalizado.length > 800) {
      setError("El aprendizaje esperado no puede superar 800 caracteres.");
      return;
    }
    if (ayudaNormalizada.length > 800) {
      setError("La ayuda no puede superar 800 caracteres.");
      return;
    }

    let contenido: Record<string, unknown> | null = null;

    if (tipoHistoricoEnEdicion) {
      // Un tipo histórico se conserva tal cual: ya no tiene editor vigente,
      // pero sus datos sí deben poder mantenerse al actualizar metadatos.
      contenido = actividadInicial?.contenido ?? {};
    } else if (nombreTipo === "opcion_justificacion") {
      const rondasValidas: {
        contexto?: string;
        pregunta: string;
        opciones: string[];
        respuesta_correcta: string;
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
        rondasValidas.push({
          contexto: rondasOJ[i].contexto.trim() || undefined,
          pregunta: rondasOJ[i].pregunta,
          opciones: listaOpciones,
          respuesta_correcta: rondasOJ[i].respuestaCorrecta,
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
        ...(c.reintento_alternativo ? { reintento_alternativo: c.reintento_alternativo } : {}),
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
        if (celdaCorrecta.some((fila) => fila.some((v) => !v || !listaBancoComp.includes(v)))) {
          setError(
            "Elige la respuesta correcta del banco para cada celda de la cuadrícula (si editaste el banco de respuestas, revisa que ninguna celda haya quedado apuntando a una opción que ya quitaste).",
          );
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
      const indices = barajarIndices(combinados.length);
      const fragmentosMezclados = indices.map((i) => combinados[i]);
      const ordenCorrecto = correctos.map((_, origIdx) => indices.indexOf(origIdx));
      contenido = {
        contexto: contextoOF.trim() || null,
        fragmentos: fragmentosMezclados,
        orden_correcto: ordenCorrecto,
      };
    } else if (nombreTipo === "evaluar_videos") {
      const listaCualidades = lineas(cualidadesEV);
      if (listaCualidades.length < 3) {
        setError("Escribe al menos 3 cualidades a evaluar, una por línea.");
        return;
      }
      contenido = {
        intro: introVideos.trim() || null,
        cualidades: listaCualidades,
        video_bien: {
          url: videoBienUrl.trim() || null,
          presentes: videoBienPresentes.filter((c) => listaCualidades.includes(c)),
        },
        video_mal: {
          url: videoMalUrl.trim() || null,
          ausentes: videoMalAusentes.filter((c) => listaCualidades.includes(c)),
        },
      };
    } else if (nombreTipo === "corregir_ortografia") {
      if (!textoIncorrecto.trim() || !textoCorrecto.trim()) {
        setError("Escribe el texto con errores y su versión correcta.");
        return;
      }
      // La calificación compara palabra por palabra POR POSICIÓN (mismo
      // tokenizador que usa el estudiante) — si los dos textos no tienen
      // exactamente el mismo número de palabras, la comparación se
      // desalinea a partir de ahí y el estudiante puede corregir todo bien
      // y aun así salir mal calificado, sin que nadie lo note.
      const numPalabrasIncorrecto = tokenizar(textoIncorrecto).length;
      const numPalabrasCorrecto = tokenizar(textoCorrecto).length;
      if (numPalabrasIncorrecto !== numPalabrasCorrecto) {
        setError(
          `El texto con errores tiene ${numPalabrasIncorrecto} palabra(s) y la versión correcta tiene ${numPalabrasCorrecto}. Deben tener exactamente las mismas palabras, en el mismo orden. Solo cambia la ortografía; no agregues ni quites palabras.`,
        );
        return;
      }
      // Se valida contra el propio tokenizador del estudiante para
      // detectar de una vez si la docente escribió textos idénticos por
      // error (nada que corregir).
      const diferencias = compararPalabras(textoCorrecto, textoIncorrecto).filter((c) => !c.correcto).length;
      if (diferencias === 0) {
        setError("El texto incorrecto y el correcto son idénticos. No hay nada que corregir.");
        return;
      }
      contenido = {
        contexto: contextoOrtografia.trim() || null,
        texto_incorrecto: textoIncorrecto,
        texto_correcto: textoCorrecto,
        temas: listaTemasOrtografia.length > 0 ? listaTemasOrtografia : undefined,
      };
    } else {
      setError("Este tipo de actividad todavía no está disponible para crear.");
      return;
    }

    if (contenido) {
      contenido = {
        ...contenido,
        instrucciones_momentos: {
          presentacion: instruccionPresentacionNormalizada,
          video: instruccionVideoNormalizada,
          actividad: instruccionesNormalizadas,
        },
      };
      if (ayudaNormalizada) contenido = { ...contenido, _ayuda: ayudaNormalizada };
    }

    const videoUrlNormalizada = videoUrl.trim();
    const videosConfigurados = [
      { etiqueta: "El video de apoyo", url: videoUrlNormalizada },
      { etiqueta: "El Video A", url: videoBienUrl.trim() },
      { etiqueta: "El Video B", url: videoMalUrl.trim() },
    ];
    for (const video of videosConfigurados) {
      if (video.url && !esVideoUrlPermitida(video.url)) {
        setError(`${video.etiqueta} debe ser un enlace HTTPS de YouTube.`);
        return;
      }
    }

    setCargando(true);
    const supabase = createClient();

    if (modoEdicion) {
      const { error: updateError } = await supabase
        .from("actividades")
        .update({
          titulo: tituloNormalizado,
          instrucciones: instruccionesNormalizadas,
          aprendizaje_esperado: aprendizajeNormalizado || null,
          video_url: videoUrlNormalizada || null,
          contenido,
        })
        .eq("id", actividadInicial!.id);
      if (updateError) {
        setError(mensajeError(updateError));
        setCargando(false);
        return;
      }
    } else {
      const { count, error: countError } = await supabase
        .from("actividades")
        .select("id", { count: "exact", head: true })
        .eq("unidad_id", unidadId);
      if (countError) {
        setError("No pudimos determinar el orden de la nueva actividad. Intenta de nuevo.");
        setCargando(false);
        return;
      }

      const { error: insertError } = await supabase.from("actividades").insert({
        unidad_id: unidadId,
        tipo_id: tipoId,
        titulo: tituloNormalizado,
        instrucciones: instruccionesNormalizadas,
        aprendizaje_esperado: aprendizajeNormalizado || null,
        video_url: videoUrlNormalizada || null,
        contenido,
        orden: (count ?? 0) + 1,
      });
      if (insertError) {
        setError(mensajeError(insertError));
        setCargando(false);
        return;
      }
      if (usuarioId) localStorage.removeItem(claveBorrador(unidadId, usuarioId));
      localStorage.removeItem(claveBorradorLegacy(unidadId));
    }

    router.push(`/docente/unidades/${unidadId}`);
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
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <PageHeader
        volverHref={`/docente/unidades/${unidadId}`}
        eyebrow={modoEdicion ? "Editar actividad" : "Nueva actividad"}
        titulo={modoEdicion ? actividadInicial!.titulo : "Crear actividad"}
      />

      <Card className="border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Ruta rápida para crearla</p>
        <ol className="mt-2 grid gap-2 text-sm text-slate-600 dark:text-slate-400 sm:grid-cols-3">
          <li><span className="font-semibold text-indigo-700 dark:text-indigo-300">1.</span> Elige la dinámica.</li>
          <li><span className="font-semibold text-indigo-700 dark:text-indigo-300">2.</span> Escribe una instrucción clara.</li>
          <li><span className="font-semibold text-indigo-700 dark:text-indigo-300">3.</span> Revisa el contenido antes de guardar.</li>
        </ol>
      </Card>

      {borradorRestaurado && (
        <Alert tono="info">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Recuperamos el borrador que estabas escribiendo.</span>
            <button
              type="button"
              onClick={descartarBorrador}
              className="text-xs font-semibold underline underline-offset-2 hover:no-underline"
            >
              Descartar borrador
            </button>
          </div>
        </Alert>
      )}

      {errorCargaTipos && <Alert tono="error">{errorCargaTipos}</Alert>}
      {contenidoBloqueado && (
        <Alert tono="warning">
          Esta actividad ya tiene entregas. Su contenido no se puede modificar porque podría cambiar la interpretación de respuestas previas. Puedes actualizar el video desde la lista de actividades.
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
    <fieldset disabled={contenidoBloqueado || cargandoTipos || Boolean(errorCargaTipos)} className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4 p-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Datos que verá el estudiante</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Define el propósito y las instrucciones antes de preparar la dinámica.
            </p>
          </div>
          <Field>
            <Label htmlFor="tipo">Dinámica de la actividad</Label>
            <Select id="tipo" value={tipoId} onChange={(e) => setTipoId(e.target.value)} disabled={modoEdicion || tipos.length === 0}>
              {cargandoTipos && <option value="">Cargando tipos de actividad…</option>}
              {!cargandoTipos && !tipos.length && <option value="">No hay tipos disponibles</option>}
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {etiquetaTipo(t.nombre)}
                </option>
              ))}
            </Select>
            {nombreTipo && <HelpText>{DESCRIPCION_TIPO[nombreTipo] ?? "Configura esta dinámica paso a paso."}</HelpText>}
            {modoEdicion && (
              <HelpText>El tipo no se puede cambiar una vez creada la actividad.</HelpText>
            )}
            {tipoHistoricoEnEdicion && (
              <HelpText>
                Esta actividad usa un tipo histórico. Se conservará su contenido mientras editas sus datos generales; ese tipo ya no está disponible para nuevas actividades.
              </HelpText>
            )}
            {!disponible && tipoId && (
              <HelpText>
                Este tipo histórico ya no está disponible para nuevas actividades. Los tipos vigentes son: {TIPOS_ACTIVIDAD_ACTUALES.map(etiquetaTipo).join(", ")}.
              </HelpText>
            )}
          </Field>

          <Field>
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" required maxLength={160} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            <HelpText>Usa un título breve que indique qué hará el estudiante.</HelpText>
          </Field>

          <Field>
            <Label htmlFor="instruccionPresentacion">Momento 1 · Presentación y expectativa</Label>
            <Textarea
              id="instruccionPresentacion"
              required
              maxLength={1200}
              value={instruccionPresentacion}
              onChange={(e) => setInstruccionPresentacion(e.target.value)}
              rows={2}
            />
            <HelpText>Indica qué debe observar, pensar o anticipar antes de ver el video.</HelpText>
          </Field>

          <Field>
            <Label htmlFor="instruccionVideo">Momento 2 · Video de apoyo</Label>
            <Textarea
              id="instruccionVideo"
              required
              maxLength={1200}
              value={instruccionVideo}
              onChange={(e) => setInstruccionVideo(e.target.value)}
              rows={2}
            />
            <HelpText>Indica qué debe buscar o relacionar mientras observa el video.</HelpText>
          </Field>

          <Field>
            <Label htmlFor="instrucciones">Momento 3 · Resolver la actividad</Label>
            <Textarea
              id="instrucciones"
              required
              maxLength={3000}
              value={instrucciones}
              onChange={(e) => setInstrucciones(e.target.value)}
              rows={2}
            />
            <HelpText>Escribe una acción concreta: qué debe leer, elegir, ordenar, comparar o redactar.</HelpText>
          </Field>

          <Field>
            <Label htmlFor="aprendizajeEsperado">Aprendizaje esperado (opcional)</Label>
            <Textarea
              id="aprendizajeEsperado"
              maxLength={800}
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
            <Label htmlFor="ayuda">Ayuda si te atoras (opcional)</Label>
            <Textarea
              id="ayuda"
              maxLength={800}
              value={ayuda}
              onChange={(e) => setAyuda(e.target.value)}
              rows={2}
              placeholder="Ej. Primero identifica quién habla y quién escucha; después explica qué cambia entre ambos papeles."
            />
            <HelpText>
              Se mostrará como una pista breve al estudiante, sin revelar la respuesta. Una idea, ejemplo o pregunta guía suele ayudar más que otra instrucción larga.
            </HelpText>
          </Field>

          <Field>
            <Label htmlFor="videoUrl">Video de apoyo en YouTube (opcional)</Label>
            <Input
              id="videoUrl"
              type="url"
              maxLength={500}
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <HelpText>
              Usa un enlace público o no listado de YouTube. Se mostrará en el momento 2, antes del ejercicio.
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
                Contenido de la dinámica: {etiquetaTipo(nombreTipo)}
              </h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Completa solo los campos de esta dinámica. La vista previa te ayuda a revisar lo que recibirá el estudiante.
            </p>

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
                    Se muestra una sola vez, antes de la primera pregunta. Es útil para un simulador o
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
                        <Label htmlFor={`opciones-oj-${i}`}>Opciones de respuesta (una por línea)</Label>
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
                          Elige aquí la respuesta correcta entre las opciones que escribiste arriba.
                        </HelpText>
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
                    Párrafo o contexto (opcional). El estudiante lo ve arriba de la lista.
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
                    Escribe primero las categorías de arriba. Aquí eliges la correcta para cada elemento
                    de una lista, sin escribirla a mano.
                  </HelpText>
                  {filaEditor(elementosFilas, setElementosFilas, listaCategorias, "Elige categoría")}
                </Field>
                {vistaPrevia(elementosFilas)}
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
                    espacio para arrastrar la respuesta correcta y la actividad se autocalifica.
                    Puedes agregar más respuestas de las que caben en la cuadrícula, como señuelo.
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
                    En &quot;Leer y reflexionar&quot; el estudiante no escribe nada. Solo compara 3 ejemplos ya
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
                    Texto fuente (opcional). El estudiante lo leerá antes{" "}
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
                        Ejemplos ya resueltos (opcional). Incluye resumen, síntesis y paráfrasis del mismo texto,
                        como referencia antes de escribir.
                      </Label>
                      <Textarea
                        id="ejemplosResueltos"
                        value={ejemplosResueltos}
                        onChange={(e) => setEjemplosResueltos(e.target.value)}
                        rows={8}
                      />
                      <HelpText>
                        El estudiante lo ve detrás de un botón &quot;Ver ejemplos ya resueltos&quot;, no de entrada.
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
                  <Label htmlFor="contexto">Contexto (opcional). Introduce la fuente, por ejemplo, &quot;canción&quot; o &quot;diálogo&quot;.</Label>
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
                    Escribe primero las etiquetas de arriba. Aquí eliges la correcta para cada fragmento
                    de una lista, sin escribirla a mano.
                  </HelpText>
                  {filaEditor(fragmentosFilas, setFragmentosFilas, listaEtiquetas, "Elige etiqueta")}
                </Field>
                {vistaPrevia(fragmentosFilas)}
              </>
            )}

            {nombreTipo === "ordenar_fragmentos" && (
              <>
                <Field>
                  <Label htmlFor="contextoOF">Contexto (opcional). Es la instrucción general antes de la lista.</Label>
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
                    El estudiante los va a ver revueltos junto con los distractores. Escríbelos aquí en
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
                    Fragmentos que NO pertenecen a la secuencia. El estudiante debe dejarlos fuera.
                  </HelpText>
                </Field>
              </>
            )}

            {nombreTipo === "evaluar_videos" && (
              <>
                <Field>
                  <Label htmlFor="introVideos">Introducción (opcional)</Label>
                  <Textarea
                    id="introVideos"
                    value={introVideos}
                    onChange={(e) => setIntroVideos(e.target.value)}
                    rows={2}
                  />
                </Field>
                <Field>
                  <Label htmlFor="cualidadesEV">Cualidades a evaluar (una por línea)</Label>
                  <Textarea
                    id="cualidadesEV"
                    required
                    value={cualidadesEV}
                    onChange={(e) => setCualidadesEV(e.target.value)}
                    rows={5}
                    placeholder={"Volumen\nDicción\nContacto visual\nOrganización de las ideas"}
                    className="font-mono text-sm"
                  />
                  <ContadorLineas texto={cualidadesEV} singular="cualidad" plural="cualidades" />
                </Field>
                <Field>
                  <Label htmlFor="videoBienUrl">Video A: URL (respeta las cualidades)</Label>
                    <Input
                      id="videoBienUrl"
                      type="url"
                      maxLength={500}
                    value={videoBienUrl}
                    onChange={(e) => setVideoBienUrl(e.target.value)}
                    placeholder="https://youtube.com/..."
                  />
                  <HelpText>
                    Si todavía no tienes el video, déjalo vacío. El estudiante ve &quot;Video
                    próximamente&quot; hasta que lo agregues.
                  </HelpText>
                </Field>
                {listaCualidadesEV.length > 0 && (
                  <Field>
                    <Label>¿Cuáles cualidades sí demuestra el Video A?</Label>
                    <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                      {listaCualidadesEV.map((c) => (
                        <label key={c} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={videoBienPresentes.includes(c)}
                            onChange={() => alternarCualidad(videoBienPresentes, setVideoBienPresentes, c)}
                            className="size-4 shrink-0 rounded border-slate-300 accent-indigo-600 dark:border-slate-600"
                          />
                          {c}
                        </label>
                      ))}
                    </div>
                  </Field>
                )}
                <Field>
                  <Label htmlFor="videoMalUrl">Video B: URL (no respeta las cualidades)</Label>
                    <Input
                      id="videoMalUrl"
                      type="url"
                      maxLength={500}
                    value={videoMalUrl}
                    onChange={(e) => setVideoMalUrl(e.target.value)}
                    placeholder="https://youtube.com/..."
                  />
                </Field>
                {listaCualidadesEV.length > 0 && (
                  <Field>
                    <Label>¿Cuáles cualidades le hacen falta al Video B?</Label>
                    <div className="flex flex-col gap-1.5 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                      {listaCualidadesEV.map((c) => (
                        <label key={c} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={videoMalAusentes.includes(c)}
                            onChange={() => alternarCualidad(videoMalAusentes, setVideoMalAusentes, c)}
                            className="size-4 shrink-0 rounded border-slate-300 accent-indigo-600 dark:border-slate-600"
                          />
                          {c}
                        </label>
                      ))}
                    </div>
                  </Field>
                )}
              </>
            )}

            {nombreTipo === "corregir_ortografia" && (
              <>
                <Field>
                  <Label htmlFor="contextoOrtografia">Contexto (opcional)</Label>
                  <Textarea
                    id="contextoOrtografia"
                    value={contextoOrtografia}
                    onChange={(e) => setContextoOrtografia(e.target.value)}
                    rows={2}
                  />
                </Field>
                <Field>
                  <Label htmlFor="textoIncorrecto">Texto con errores (el estudiante lo verá tal cual)</Label>
                  <Textarea
                    id="textoIncorrecto"
                    required
                    value={textoIncorrecto}
                    onChange={(e) => setTextoIncorrecto(e.target.value)}
                    rows={6}
                  />
                </Field>
                <Field>
                  <Label htmlFor="textoCorrecto">Versión correcta (clave de calificación). No la ve el estudiante.</Label>
                  <Textarea
                    id="textoCorrecto"
                    required
                    value={textoCorrecto}
                    onChange={(e) => setTextoCorrecto(e.target.value)}
                    rows={6}
                  />
                  <HelpText>
                    Debe tener las mismas palabras, en el mismo orden, que el texto con errores. Solo cambia
                    mayúsculas, tildes o letras. Se compara palabra por palabra.
                  </HelpText>
                </Field>
                {textoIncorrecto.trim() && textoCorrecto.trim() && (
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    {compararPalabras(textoCorrecto, textoIncorrecto).filter((c) => !c.correcto).length}{" "}
                    diferencia(s) detectada(s) entre ambos textos (se acepta hasta 5 como aprobatorio).
                  </p>
                )}
                <Field>
                  <Label htmlFor="temasOrtografia">Temas que cubre (opcional, uno por línea)</Label>
                  <Textarea
                    id="temasOrtografia"
                    value={temasOrtografia}
                    onChange={(e) => setTemasOrtografia(e.target.value)}
                    rows={2}
                    placeholder={"Tildes diacríticas\nMayúsculas\nB/V"}
                    className="font-mono text-sm"
                  />
                  <ContadorLineas texto={temasOrtografia} singular="tema" plural="temas" />
                </Field>
              </>
            )}
          </Card>
        )}

        {error && <Alert tono="error">{error}</Alert>}

        <Boton
          type="submit"
          disabled={cargando || cargandoTipos || Boolean(errorCargaTipos) || contenidoBloqueado || !tipoId || !puedeGuardar}
          cargando={cargando}
          className="self-start"
        >
          {cargando ? "Guardando..." : modoEdicion ? "Guardar cambios" : "Crear actividad"}
        </Boton>
        </fieldset>
      </form>
    </div>
  );
}
