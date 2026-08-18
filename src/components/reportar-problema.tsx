"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { LifeBuoy, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIAS_REPORTE, ETIQUETAS_CATEGORIA, ESTADOS_REPORTE, type CategoriaReporte } from "@/lib/reportes-constantes";
import Boton from "@/components/ui/button";
import { ErrorText, Field, HelpText, Label } from "@/components/ui/field";

const AYUDAS: Record<CategoriaReporte, { titulo: string; pasos: string[] } | undefined> = {
  acceso: {
    titulo: "Prueba esto antes de reportarlo",
    pasos: ["Confirma que estás usando el código, nombre y NIP de tu grupo.", "Si olvidaste el NIP, pide a la docente que lo reinicie desde su grupo."],
  },
  actividad: {
    titulo: "Revisa estos pasos",
    pasos: ["Guarda la respuesta antes de salir.", "Si la actividad depende de otra, termina la anterior y vuelve a intentarlo.", "Si te quedan intentos, usa el botón de volver a intentar."],
  },
  avance: {
    titulo: "El avance suele depender de esto",
    pasos: ["Comprueba que la actividad anterior esté guardada.", "Revisa si falta una reflexión o una actividad de cierre.", "Actualiza la pantalla una sola vez después de guardar."],
  },
  video: {
    titulo: "Prueba la reproducción",
    pasos: ["Comprueba tu conexión y toca el botón de reproducir.", "Si YouTube no abre, prueba otra red o desactiva temporalmente el ahorro de datos."],
  },
  carga: {
    titulo: "Antes de enviarlo",
    pasos: ["Espera unos segundos y actualiza una sola vez.", "Si ocurre en varias pantallas, prueba otra red y anota cuál estabas usando."],
  },
  contenido: {
    titulo: "Este caso sí conviene reportarlo",
    pasos: ["Indica qué texto, instrucción o respuesta parece incorrecta.", "Si puedes, copia únicamente la frase problemática; no incluyas NIP ni contraseñas."],
  },
  orientacion: {
    titulo: "Busca primero la instrucción de la pantalla",
    pasos: ["Lee el bloque de instrucciones de la actividad o unidad.", "Revisa el botón de ayuda de esa sección y el avance de la unidad.", "Si todavía no sabes qué hacer, envía el reporte con tu pregunta concreta."],
  },
  otro: undefined,
};

type ReportePropio = {
  id: string;
  categoria: string;
  descripcion: string;
  estado: string;
  resolucion: string | null;
  created_at: string;
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
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState<"formulario" | "reportes">("formulario");
  const [categoria, setCategoria] = useState<CategoriaReporte>("otro");
  const [descripcion, setDescripcion] = useState("");
  const [cargando, setCargando] = useState(false);
  const [cargandoReportes, setCargandoReportes] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [misReportes, setMisReportes] = useState<ReportePropio[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function cerrar() {
    if (cargando || cargandoReportes) return;
    setAbierto(false);
    setVista("formulario");
    setEnviado(false);
    setMisReportes(null);
    setError(null);
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
      .select("id, categoria, descripcion, estado, resolucion, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (consultaError) {
      setError("No pudimos cargar tus reportes. Revisa tu conexión e inténtalo de nuevo.");
      setCargandoReportes(false);
      return;
    }

    setMisReportes((data ?? []) as ReportePropio[]);
    setVista("reportes");
    setCargandoReportes(false);
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
      setError("Ya registraste un reporte parecido recientemente. Puedes consultar su estado en “Mis reportes”.");
      setCargando(false);
      return;
    }

    setDescripcion("");
    setCargando(false);
    setMisReportes(null);
    setEnviado(true);
  }

  const ayuda = AYUDAS[categoria];

  return (
    <div className={`fixed ${tipo === "estudiante" && navegacionInferior ? "bottom-24" : "bottom-4"} right-4 z-30 sm:right-6`}>
      {abierto ? (
        <div role="dialog" aria-modal="true" aria-labelledby="reporte-titulo" className="w-[min(92vw,22rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="reporte-titulo" className="font-semibold text-slate-900 dark:text-slate-50">Ayuda y reportes</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Primero encontrarás una orientación rápida; si no basta, envía el caso.</p>
            </div>
            <button type="button" onClick={cerrar} aria-label="Cerrar ayuda" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-slate-800 dark:hover:text-slate-200">
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-3 flex gap-2 border-b border-slate-100 pb-3 text-xs dark:border-slate-800">
            <button type="button" onClick={() => { setVista("formulario"); setEnviado(false); setError(null); }} className={`rounded-lg px-2.5 py-1.5 font-semibold ${vista === "formulario" ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}>Levantar reporte</button>
            <button type="button" onClick={abrirMisReportes} disabled={cargandoReportes} className={`rounded-lg px-2.5 py-1.5 font-semibold ${vista === "reportes" ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300" : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}>
              {cargandoReportes ? "Cargando…" : "Mis reportes"}
            </button>
          </div>

          {vista === "reportes" ? (
            <div className="mt-4 flex flex-col gap-3">
              {!misReportes || misReportes.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">Todavía no tienes reportes registrados.</p>
              ) : (
                <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
                  {misReportes.map((reporte) => (
                    <article key={reporte.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-50">{etiquetaCategoria(reporte.categoria)}</p>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{ESTADOS_REPORTE[reporte.estado] ?? reporte.estado}</span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{reporte.descripcion}</p>
                      {reporte.resolucion && <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs leading-relaxed text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">{reporte.resolucion}</p>}
                      <time dateTime={reporte.created_at} className="mt-2 block text-[11px] text-slate-400 dark:text-slate-500">{reporte.created_at.slice(0, 10)}</time>
                    </article>
                  ))}
                </div>
              )}
              {error && <ErrorText>{error}</ErrorText>}
            </div>
          ) : enviado ? (
            <div className="mt-4 flex flex-col gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              <p className="font-semibold">Reporte enviado.</p>
              <p>Ya registramos dónde ocurrió. Puedes continuar trabajando mientras se revisa.</p>
              <div className="flex flex-wrap gap-2">
                <Boton type="button" size="sm" variant="secondary" onClick={abrirMisReportes}>Ver mis reportes</Boton>
                <Boton type="button" size="sm" variant="secondary" onClick={cerrar}>Cerrar</Boton>
              </div>
            </div>
          ) : (
            <form onSubmit={enviar} className="mt-4 flex flex-col gap-3">
              <Field>
                <Label htmlFor="reporte-categoria">¿Qué ocurrió?</Label>
                <select id="reporte-categoria" value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaReporte)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">
                  {CATEGORIAS_REPORTE.map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
                </select>
              </Field>
              {ayuda && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs leading-relaxed text-slate-700 dark:border-indigo-900/70 dark:bg-indigo-950/30 dark:text-slate-300">
                  <p className="font-semibold text-slate-900 dark:text-slate-50">{ayuda.titulo}</p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-4">
                    {ayuda.pasos.map((paso) => <li key={paso}>{paso}</li>)}
                  </ul>
                  <p className="mt-2 text-slate-500 dark:text-slate-400">Si no se resuelve, envía el reporte y lo revisaremos.</p>
                </div>
              )}
              <Field>
                <Label htmlFor="reporte-descripcion">Descríbelo brevemente</Label>
                <textarea id="reporte-descripcion" required minLength={10} maxLength={2000} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={4} placeholder="Ejemplo: terminé la actividad anterior, pero la siguiente sigue bloqueada." className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50" />
                <HelpText>Se adjunta automáticamente la pantalla, unidad y actividad cuando se pueden identificar. No escribas contraseñas ni NIP.</HelpText>
              </Field>
              {error && <ErrorText>{error}</ErrorText>}
              <Boton type="submit" size="sm" cargando={cargando}>
                <Send className="size-4" aria-hidden="true" />
                {cargando ? "Enviando…" : "Enviar reporte"}
              </Boton>
            </form>
          )}
        </div>
      ) : (
        <button type="button" onClick={() => setAbierto(true)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-lg shadow-slate-900/10 transition hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-950/50">
          <LifeBuoy className="size-4" aria-hidden="true" />
          Ayuda y reportes
        </button>
      )}
    </div>
  );
}
