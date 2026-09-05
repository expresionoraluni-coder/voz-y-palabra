"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, LifeBuoy, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  CATEGORIAS_REPORTE_DOCENTE,
  CATEGORIAS_REPORTE_ESTUDIANTE,
  ETIQUETAS_CATEGORIA,
  ESTADOS_REPORTE,
  type CategoriaReporte,
} from "@/lib/reportes-constantes";
import Boton from "@/components/ui/button";
import { ErrorText, Field, HelpText, Label } from "@/components/ui/field";
import { faqFallback, idFaqValido, normalizarFaqArticulo, type FaqArticulo } from "@/lib/faq";

type AyudaRapida = { titulo: string; pasos: string[] };

const AYUDAS_ESTUDIANTE: Partial<Record<CategoriaReporte, AyudaRapida>> = {
  estudiante_acceso: {
    titulo: "Comprueba tus datos",
    pasos: ["Usa el código exacto de tu grupo y escribe tu nombre como aparece en la lista.", "Si olvidaste tu NIP, pide a la docente que lo reinicie desde tu grupo."],
  },
  estudiante_actividad: {
    titulo: "Antes de pedir ayuda",
    pasos: ["Guarda tu respuesta antes de salir.", "Si depende de otra actividad, termina la anterior y guarda su reflexión.", "Cada actividad tiene un solo intento; revisa tu respuesta antes de guardarla y repórtalo aquí si algo no funciona."],
  },
  estudiante_avance: {
    titulo: "Revisa qué falta",
    pasos: ["Confirma que la actividad anterior esté guardada y aprobada.", "Revisa si falta una reflexión o el cierre de la unidad.", "Actualiza una sola vez después de guardar."],
  },
  estudiante_instruccion: {
    titulo: "Encuentra la indicación",
    pasos: ["Lee la instrucción de la sección que tienes abierta.", "Revisa el ejemplo o criterio que aparece antes de responder.", "Si todavía tienes dudas, explica qué parte no entiendes."],
  },
  estudiante_video: {
    titulo: "Prueba el video",
    pasos: ["Comprueba tu conexión y toca reproducir.", "Si no abre, prueba otra red o dispositivo.", "Indica el nombre de la actividad si sigue sin funcionar."],
  },
  estudiante_tecnico: {
    titulo: "Descarta una falla momentánea",
    pasos: ["Espera unos segundos y actualiza una sola vez.", "Si ocurre en varias pantallas, prueba otra red.", "Indica qué botón tocaste y qué esperabas que ocurriera."],
  },
  estudiante_contenido: {
    titulo: "Ayúdanos a ubicarlo",
    pasos: ["Escribe el nombre de la unidad y actividad.", "Copia solo la frase o instrucción problemática.", "No incluyas tu NIP, contraseña ni datos de otros estudiantes."],
  },
};

const AYUDAS_DOCENTE: Partial<Record<CategoriaReporte, AyudaRapida>> = {
  docente_acceso: {
    titulo: "Comprueba tu cuenta",
    pasos: ["Usa el correo confirmado con el que registraste tu cuenta.", "Si es tu primer ingreso, termina la verificación con el código de invitación."],
  },
  docente_grupo: {
    titulo: "Ubica el grupo correcto",
    pasos: ["Revisa la nomenclatura visible del grupo antes de editarlo.", "Confirma que estás dentro del grupo que quieres administrar.", "Indica qué acción intentabas realizar."],
  },
  docente_estudiantes: {
    titulo: "Revisa la lista",
    pasos: ["Usa el archivo de Excel con nombre y boleta en sus columnas.", "Corrige duplicados o filas incompletas antes de cargarlo.", "Para un NIP olvidado, usa Reiniciar NIP desde la ficha del estudiante."],
  },
  docente_actividad: {
    titulo: "Antes de guardar",
    pasos: ["Completa título, instrucciones, tipo y orden.", "Revisa la vista previa y confirma que la respuesta esperada no revele la solución al estudiante.", "Guarda una sola vez y espera el mensaje de confirmación."],
  },
  docente_seguimiento: {
    titulo: "Comprueba el contexto",
    pasos: ["Verifica que estés en el grupo correcto.", "Actualiza una sola vez si acabas de recibir una entrega.", "Indica qué cifra o estudiante no coincide con lo esperado."],
  },
  docente_video: {
    titulo: "Revisa el enlace",
    pasos: ["Usa un enlace HTTPS de YouTube.", "Ábrelo en una pestaña nueva para confirmar que funciona.", "Indica la actividad donde debe aparecer."],
  },
  docente_tecnico: {
    titulo: "Descarta una falla momentánea",
    pasos: ["Espera unos segundos y actualiza una sola vez.", "Si ocurre en varias pantallas, prueba otra red.", "Indica la acción exacta que no respondió."],
  },
};

type ReportePropio = {
  id: string;
  categoria: string;
  descripcion: string;
  estado: string;
  respuesta_publica: string | null;
  created_at: string;
  updated_at: string;
};

type MensajePropio = {
  id: string;
  reporte_id: string;
  autor_tipo: "reportante" | "administrador";
  mensaje: string;
  creado_en: string;
};

const UUID_FRAGMENT = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

function capturarId(pathname: string, segmentos: string) {
  return pathname.match(new RegExp(`/(?:${segmentos})/(${UUID_FRAGMENT})(?:/|$)`, "i"))?.[1] ?? null;
}

function contextoDeRuta(pathname: string) {
  return {
    grupoId: capturarId(pathname, "grupos"),
    unidadId: capturarId(pathname, "unidad|unidades"),
    actividadId: capturarId(pathname, "actividad|actividades"),
  };
}

function etiquetaCategoria(categoria: string) {
  return ETIQUETAS_CATEGORIA[categoria] ?? categoria;
}

function folioReporte(id: string) {
  return id.slice(0, 8).toUpperCase();
}

export default function ReportarProblema({
  tipo,
  estudianteId,
  docenteId,
  grupoId,
  navegacionInferior = true,
}: {
  tipo: "estudiante" | "docente";
  estudianteId?: string;
  docenteId?: string;
  grupoId?: string;
  navegacionInferior?: boolean;
}) {
  const pathname = usePathname();
  const categorias = tipo === "estudiante" ? CATEGORIAS_REPORTE_ESTUDIANTE : CATEGORIAS_REPORTE_DOCENTE;
  const ayudas = tipo === "estudiante" ? AYUDAS_ESTUDIANTE : AYUDAS_DOCENTE;
  const audiencia = tipo === "estudiante" ? "estudiante" : "docente";
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState<"formulario" | "reportes">("formulario");
  const [categoria, setCategoria] = useState<CategoriaReporte>(tipo === "estudiante" ? "estudiante_actividad" : "docente_grupo");
  const [descripcion, setDescripcion] = useState("");
  const [cargando, setCargando] = useState(false);
  const [cargandoReportes, setCargandoReportes] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [reporteEnviadoId, setReporteEnviadoId] = useState<string | null>(null);
  const [misReportes, setMisReportes] = useState<ReportePropio[] | null>(null);
  const [faqArticulos, setFaqArticulos] = useState<FaqArticulo[] | null>(null);
  const [faqCargando, setFaqCargando] = useState(false);
  const [faqResuelto, setFaqResuelto] = useState(false);
  const [respuestasFaq, setRespuestasFaq] = useState<Record<string, string>>({});
  const [mensajesReporte, setMensajesReporte] = useState<Record<string, string>>({});
  const [mensajesPropios, setMensajesPropios] = useState<Record<string, MensajePropio[]>>({});
  const [enviandoMensajeId, setEnviandoMensajeId] = useState<string | null>(null);
  const [mensajeEnviadoId, setMensajeEnviadoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const primerFocoRef = useRef<HTMLButtonElement>(null);
  const focoAnteriorRef = useRef<HTMLElement | null>(null);
  const faqMostradaRef = useRef<string | null>(null);
  const faqCargaIniciadaRef = useRef(false);

  const cerrar = useCallback(() => {
    if (cargando || cargandoReportes) return;
    setAbierto(false);
    setVista("formulario");
    setEnviado(false);
    setReporteEnviadoId(null);
    setMisReportes(null);
    setFaqResuelto(false);
    setRespuestasFaq({});
    setMensajesReporte({});
    setMensajesPropios({});
    setMensajeEnviadoId(null);
    setError(null);
  }, [cargando, cargandoReportes]);

  useEffect(() => {
    if (!abierto) {
      focoAnteriorRef.current?.focus();
      focoAnteriorRef.current = null;
      return;
    }

    focoAnteriorRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => primerFocoRef.current?.focus());

    function controlarTeclado(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        cerrar();
        return;
      }

      if (evento.key !== "Tab" || !dialogRef.current) return;
      const elementosEnfoque = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (elementosEnfoque.length === 0) return;

      const primero = elementosEnfoque[0];
      const ultimo = elementosEnfoque[elementosEnfoque.length - 1];
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener("keydown", controlarTeclado);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", controlarTeclado);
    };
  }, [abierto, cerrar]);

  useEffect(() => {
    if (!abierto || faqArticulos !== null || faqCargaIniciadaRef.current) return;
    let cancelado = false;
    faqCargaIniciadaRef.current = true;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("faq_articulos")
        .select("id, audiencia, categoria, slug, titulo, resumen, pasos, preguntas")
        .eq("activo", true)
        .order("orden", { ascending: true })
        .limit(40);
      if (cancelado) return;
      const articulos = (data ?? []).map(normalizarFaqArticulo).filter((articulo): articulo is FaqArticulo => articulo !== null);
      setFaqArticulos(articulos);
      setFaqCargando(false);
    })();
    return () => {
      cancelado = true;
    };
  }, [abierto, faqArticulos, faqCargando]);

  const articuloFaq = faqArticulos?.find((articulo) => (articulo.categoria === categoria || (articulo.categoria === "tecnico" && categoria.endsWith("_tecnico"))) && (articulo.audiencia === audiencia || articulo.audiencia === "ambos"))
    ?? faqFallback(categoria, audiencia);

  useEffect(() => {
    if (!abierto || !articuloFaq || faqMostradaRef.current === articuloFaq.slug) return;
    faqMostradaRef.current = articuloFaq.slug;
    if (!idFaqValido(articuloFaq.id)) return;
    void createClient().rpc("registrar_interaccion_faq", {
      p_articulo_id: articuloFaq.id,
      p_evento: "mostrado",
      p_contexto: { origen: "boton_ayuda", ruta: pathname, audiencia },
    });
  }, [abierto, articuloFaq, audiencia, pathname]);

  function cambiarCategoria(valor: CategoriaReporte) {
    setCategoria(valor);
    setRespuestasFaq({});
    setFaqResuelto(false);
    setError(null);
  }

  function registrarEventoFaq(evento: "abierto" | "util" | "no_util" | "reporte_creado", reporteId?: string | null) {
    if (!articuloFaq || !idFaqValido(articuloFaq.id)) return;
    void createClient().rpc("registrar_interaccion_faq", {
      p_articulo_id: articuloFaq.id,
      p_evento: evento,
      p_reporte_id: reporteId ?? null,
      p_contexto: { origen: "boton_ayuda", ruta: pathname, respuestas: respuestasFaq },
    });
  }

  async function abrirMisReportes() {
    if (cargandoReportes) return;
    if (misReportes !== null) {
      setVista("reportes");
      setError(null);
      return;
    }
    setError(null);
    setCargandoReportes(true);
    const supabase = createClient();
    const { data, error: consultaError } = await supabase
      .from("reportes")
      .select("id, categoria, descripcion, estado, respuesta_publica, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (consultaError) {
      setError("No pudimos cargar tus solicitudes. Revisa tu conexión e inténtalo de nuevo.");
      setCargandoReportes(false);
      return;
    }

    const reportes = (data ?? []) as ReportePropio[];
    const ids = reportes.map((reporte) => reporte.id);
    const { data: mensajes, error: mensajesError } = ids.length
      ? await supabase
          .from("reporte_mensajes")
          .select("id, reporte_id, autor_tipo, mensaje, creado_en")
          .in("reporte_id", ids)
          .order("creado_en", { ascending: true })
      : { data: [], error: null };
    if (mensajesError) {
      setError("Cargamos tus solicitudes, pero no pudimos cargar la conversación.");
    }
    const mapaMensajes: Record<string, MensajePropio[]> = {};
    for (const mensaje of (mensajes ?? []) as MensajePropio[]) {
      (mapaMensajes[mensaje.reporte_id] ??= []).push(mensaje);
    }
    setMensajesPropios(mapaMensajes);
    setMisReportes(reportes);
    setVista("reportes");
    setCargandoReportes(false);
  }

  async function enviarMensajeEnSolicitud(reporteId: string) {
    const mensaje = (mensajesReporte[reporteId] ?? "").trim();
    if (mensaje.length < 2 || enviandoMensajeId) return;
    setEnviandoMensajeId(reporteId);
    setError(null);
    const resultado = await createClient().rpc("registrar_mensaje_reporte", {
      p_reporte_id: reporteId,
      p_mensaje: mensaje,
    });
    if (resultado.error) {
      setError("No pudimos enviar la información adicional. Intenta de nuevo.");
      setEnviandoMensajeId(null);
      return;
    }
    setMensajesPropios((actual) => ({
      ...actual,
      [reporteId]: [
        ...(actual[reporteId] ?? []),
        {
          id: `${reporteId}-local-${(actual[reporteId] ?? []).length}`,
          reporte_id: reporteId,
          autor_tipo: "reportante",
          mensaje,
          creado_en: "",
        },
      ],
    }));
    setMensajesReporte((actual) => ({ ...actual, [reporteId]: "" }));
    setMensajeEnviadoId(reporteId);
    setEnviandoMensajeId(null);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (cargando) return;
    const texto = descripcion.trim();
    if (texto.length < 10) {
      setError("Cuéntanos un poco más para poder revisar el problema.");
      return;
    }

    setError(null);
    setCargando(true);
    const supabase = createClient();
    const ruta = contextoDeRuta(pathname);
    const contexto = {
      origen: "boton_ayuda",
      idioma: "es-MX",
      grupo_id: grupoId ?? ruta.grupoId,
      unidad_id: ruta.unidadId,
      actividad_id: ruta.actividadId,
      ...(idFaqValido(articuloFaq?.id ?? null) ? { faq_articulo_id: articuloFaq?.id } : {}),
      ...(Object.keys(respuestasFaq).length ? { faq_respuestas: respuestasFaq } : {}),
    };
    const { data: resultado, error: insertError } = await supabase.rpc("registrar_reporte", {
      p_reportante_tipo: tipo,
      p_estudiante_id: estudianteId ?? null,
      p_docente_id: docenteId ?? null,
      p_grupo_id: grupoId ?? ruta.grupoId,
      p_unidad_id: ruta.unidadId,
      p_actividad_id: ruta.actividadId,
      p_categoria: categoria,
      p_descripcion: texto,
      p_ruta: pathname,
      p_contexto: contexto,
    });

    if (insertError) {
      setError("No pudimos enviar el reporte. Revisa tu conexión e inténtalo de nuevo.");
      setCargando(false);
      return;
    }

    if (resultado?.[0]?.duplicado) {
      setError("Ya registraste una solicitud parecida recientemente. Puedes consultar su estado en “Mis solicitudes”.");
      setCargando(false);
      return;
    }

    const reporteId = resultado?.[0]?.id ?? null;
    setReporteEnviadoId(reporteId);
    if (reporteId && articuloFaq) registrarEventoFaq("reporte_creado", reporteId);
    setDescripcion("");
    setCargando(false);
    setMisReportes(null);
    setEnviado(true);
  }

  const ayuda = ayudas[categoria];
  const usaNavegacionInferior = tipo === "estudiante" && navegacionInferior;
  const claseAlturaDialogo = usaNavegacionInferior ? "max-h-[calc(100dvh-7rem)]" : "max-h-[calc(100dvh-2rem)]";

  return (
    <div className={`fixed print:hidden ${usaNavegacionInferior ? "bottom-24" : "bottom-4"} right-4 z-30 sm:right-6`}>
      {abierto ? (
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="reporte-titulo" className={`${claseAlturaDialogo} w-[min(92vw,22rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="reporte-titulo" className="font-semibold text-slate-900 dark:text-slate-50">Ayuda</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Primero encontrarás una orientación rápida; si no basta, envía una solicitud.</p>
            </div>
            <button ref={primerFocoRef} type="button" onClick={cerrar} aria-label="Cerrar ayuda" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-slate-800 dark:hover:text-slate-200">
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-3 flex gap-2 border-b border-slate-100 pb-3 text-xs dark:border-slate-800">
            <button type="button" onClick={() => { setVista("formulario"); setEnviado(false); setError(null); }} className={`rounded-lg px-2.5 py-1.5 font-semibold ${vista === "formulario" ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}>Enviar solicitud</button>
            <button type="button" onClick={abrirMisReportes} disabled={cargandoReportes} className={`rounded-lg px-2.5 py-1.5 font-semibold ${vista === "reportes" ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}>
              {cargandoReportes ? "Cargando…" : "Mis solicitudes"}
            </button>
          </div>

          {vista === "reportes" ? (
            <div className="mt-4 flex flex-col gap-3">
              {!misReportes || misReportes.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">Todavía no tienes solicitudes registradas.</p>
              ) : (
                <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
                  {misReportes.map((reporte) => (
                    <article key={reporte.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-50">{etiquetaCategoria(reporte.categoria)}</p>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{ESTADOS_REPORTE[reporte.estado] ?? reporte.estado}</span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{reporte.descripcion}</p>
                      {reporte.respuesta_publica && <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs leading-relaxed text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">{reporte.respuesta_publica}</p>}
                      <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">Folio {folioReporte(reporte.id)} · Actualizado {reporte.updated_at.slice(0, 10)}</p>
                      {(mensajesPropios[reporte.id] ?? []).length > 0 && (
                        <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Conversación</p>
                          {(mensajesPropios[reporte.id] ?? []).map((mensaje) => (
                            <div key={mensaje.id} className={`rounded-lg p-2 text-xs leading-relaxed ${mensaje.autor_tipo === "administrador" ? "bg-indigo-50 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200" : "bg-slate-50 text-slate-700 dark:bg-slate-800/70 dark:text-slate-300"}`}>
                              <p className="font-semibold">{mensaje.autor_tipo === "administrador" ? "Administración" : "Tú"}</p>
                              <p className="mt-0.5 whitespace-pre-wrap">{mensaje.mensaje}</p>
                              <time dateTime={mensaje.creado_en || undefined} className="mt-1 block text-[10px] opacity-70">{mensaje.creado_en ? new Date(mensaje.creado_en).toLocaleString("es-MX") : "Ahora"}</time>
                            </div>
                          ))}
                        </div>
                      )}
                      {reporte.estado === "necesita_informacion" && (
                        <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                          <label htmlFor={`respuesta-${reporte.id}`} className="text-xs font-semibold text-slate-700 dark:text-slate-300">El administrador necesita más información</label>
                          <textarea id={`respuesta-${reporte.id}`} value={mensajesReporte[reporte.id] ?? ""} onChange={(e) => setMensajesReporte((actual) => ({ ...actual, [reporte.id]: e.target.value }))} maxLength={2000} rows={2} placeholder="Explica qué ocurrió o qué probaste" className="w-full resize-y rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50" />
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">{mensajeEnviadoId === reporte.id ? "Información enviada." : "No incluyas contraseñas ni NIP."}</span>
                            <Boton type="button" size="sm" variant="secondary" onClick={() => enviarMensajeEnSolicitud(reporte.id)} cargando={enviandoMensajeId === reporte.id} disabled={(mensajesReporte[reporte.id] ?? "").trim().length < 2}>Enviar información</Boton>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
              {error && <ErrorText>{error}</ErrorText>}
            </div>
          ) : enviado ? (
            <div className="mt-4 flex flex-col gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              <p className="font-semibold">Solicitud enviada.</p>
              <p>Ya registramos dónde ocurrió. Puedes continuar trabajando mientras la revisamos.</p>
              {reporteEnviadoId && <p className="text-xs font-semibold">Folio de seguimiento: {folioReporte(reporteEnviadoId)}</p>}
              <div className="flex flex-wrap gap-2">
                <Boton type="button" size="sm" variant="secondary" onClick={abrirMisReportes}>Ver mis solicitudes</Boton>
                <Boton type="button" size="sm" variant="secondary" onClick={cerrar}>Cerrar</Boton>
              </div>
            </div>
          ) : faqResuelto ? (
            <div className="mt-4 flex flex-col gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              <CheckCircle2 className="size-5" aria-hidden="true" />
              <p className="font-semibold">Qué bueno, esperamos que puedas continuar.</p>
              <p>Si el problema vuelve a aparecer, abre Ayuda y envía una solicitud con la pantalla donde ocurrió.</p>
              <Boton type="button" size="sm" variant="secondary" onClick={() => setFaqResuelto(false)}>Necesito enviar otra solicitud</Boton>
            </div>
          ) : (
            <form onSubmit={enviar} className="mt-4 flex flex-col gap-3">
              <Field>
                <Label htmlFor="reporte-categoria">¿Con qué necesitas ayuda?</Label>
                <select id="reporte-categoria" value={categoria} onChange={(e) => cambiarCategoria(e.target.value as CategoriaReporte)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">
                  {categorias.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
                </select>
              </Field>
              {articuloFaq ? (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs leading-relaxed text-slate-700 dark:border-indigo-900/70 dark:bg-indigo-950/30 dark:text-slate-300">
                  <p className="font-semibold text-slate-900 dark:text-slate-50">{articuloFaq.titulo}</p>
                  <p className="mt-1">{articuloFaq.resumen}</p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-4">
                    {articuloFaq.pasos.map((paso) => <li key={paso}>{paso}</li>)}
                  </ul>
                  {articuloFaq.preguntas.map((pregunta) => (
                    <div key={pregunta.id} className="mt-3 flex flex-col gap-1.5">
                      <Label htmlFor={`faq-${pregunta.id}`}>{pregunta.pregunta}</Label>
                      <select id={`faq-${pregunta.id}`} value={respuestasFaq[pregunta.id] ?? ""} onChange={(e) => setRespuestasFaq((actual) => ({ ...actual, [pregunta.id]: e.target.value }))} className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">
                        <option value="">Selecciona una opción</option>
                        {pregunta.opciones.map((opcion) => <option key={opcion.id} value={opcion.id}>{opcion.etiqueta}</option>)}
                      </select>
                    </div>
                  ))}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => { registrarEventoFaq("util"); setFaqResuelto(true); }} className="rounded-lg bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200">Sí, me sirvió</button>
                    <button type="button" onClick={() => registrarEventoFaq("no_util")} className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50 dark:bg-slate-900 dark:text-indigo-300 dark:ring-indigo-800">No, todavía necesito ayuda</button>
                  </div>
                  {faqCargando && <p className="mt-2 text-slate-500 dark:text-slate-400">Actualizando la orientación…</p>}
                </div>
              ) : ayuda && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs leading-relaxed text-slate-700 dark:border-indigo-900/70 dark:bg-indigo-950/30 dark:text-slate-300">
                  <p className="font-semibold text-slate-900 dark:text-slate-50">{ayuda.titulo}</p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-4">
                    {ayuda.pasos.map((paso) => <li key={paso}>{paso}</li>)}
                  </ul>
                  <p className="mt-2 text-slate-500 dark:text-slate-400">Si no se resuelve, envía el reporte y lo revisaremos.</p>
                </div>
              )}
              <Field>
                <Label htmlFor="reporte-descripcion">Cuéntanos brevemente qué sucede</Label>
                <textarea id="reporte-descripcion" required minLength={10} maxLength={2000} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={4} placeholder={tipo === "estudiante" ? "Ejemplo: terminé la actividad anterior, pero la siguiente sigue bloqueada." : "Ejemplo: cargué el Excel, pero no aparecen los estudiantes del grupo."} className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50" />
                <HelpText>Se adjunta automáticamente la pantalla, unidad y actividad cuando se pueden identificar. No escribas contraseñas ni NIP.</HelpText>
              </Field>
              {error && <ErrorText>{error}</ErrorText>}
              <Boton type="submit" size="sm" cargando={cargando}>
                <Send className="size-4" aria-hidden="true" />
                {cargando ? "Enviando…" : "Enviar solicitud"}
              </Boton>
            </form>
          )}
        </div>
      ) : (
        <button type="button" onClick={() => setAbierto(true)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-lg shadow-slate-900/10 transition hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-950/50">
          <LifeBuoy className="size-4" aria-hidden="true" />
          Ayuda
        </button>
      )}
    </div>
  );
}
