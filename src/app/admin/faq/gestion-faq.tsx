"use client";

import { useState } from "react";
import { BookOpen, Check, EyeOff, Save } from "lucide-react";
import { cambiarEstadoArticuloFaq, guardarArticuloFaq } from "./acciones";
import { Card } from "@/components/ui/card";
import Boton from "@/components/ui/button";
import { ErrorText, Field, HelpText, Label } from "@/components/ui/field";

type Articulo = {
  id: string;
  audiencia: string;
  categoria: string;
  titulo: string;
  resumen: string;
  pasos: string[];
  activo: boolean;
};

export default function GestionFaq({ articulos }: { articulos: Articulo[] }) {
  const [estado, setEstado] = useState<Record<string, { cargando: boolean; guardado: boolean; error: string | null }>>({});
  const [datos, setDatos] = useState(() => Object.fromEntries(articulos.map((articulo) => [articulo.id, { titulo: articulo.titulo, resumen: articulo.resumen, pasos: articulo.pasos.join("\n") }])));

  function actualizar(id: string, campo: "titulo" | "resumen" | "pasos", valor: string) {
    setDatos((actual) => ({ ...actual, [id]: { ...actual[id], [campo]: valor } }));
  }

  async function guardar(articulo: Articulo) {
    const actual = datos[articulo.id];
    if (!actual) return;
    setEstado((previo) => ({ ...previo, [articulo.id]: { cargando: true, guardado: false, error: null } }));
    const resultado = await guardarArticuloFaq({ id: articulo.id, titulo: actual.titulo, resumen: actual.resumen, pasos: actual.pasos.split("\n") });
    setEstado((previo) => ({ ...previo, [articulo.id]: { cargando: false, guardado: resultado.ok, error: resultado.ok ? null : resultado.error ?? "No pudimos guardar." } }));
    if (resultado.ok) window.setTimeout(() => setEstado((previo) => ({ ...previo, [articulo.id]: { ...previo[articulo.id], guardado: false } })), 1800);
  }

  async function cambiarEstado(articulo: Articulo) {
    setEstado((previo) => ({ ...previo, [articulo.id]: { cargando: true, guardado: false, error: null } }));
    const resultado = await cambiarEstadoArticuloFaq(articulo.id, !articulo.activo);
    setEstado((previo) => ({ ...previo, [articulo.id]: { cargando: false, guardado: resultado.ok, error: resultado.ok ? null : resultado.error ?? "No pudimos cambiar el estado." } }));
    if (resultado.ok) window.location.reload();
  }

  return (
    <section className="flex flex-col gap-4" aria-label="Artículos de ayuda">
      {articulos.map((articulo) => {
        const actual = datos[articulo.id];
        const feedback = estado[articulo.id];
        return (
          <Card key={articulo.id} className="flex flex-col gap-4 p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"><BookOpen className="size-4" aria-hidden="true" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">{articulo.audiencia} · {articulo.categoria}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{articulo.activo ? "Visible para usuarios" : "Oculto"}</p>
              </div>
              <Boton type="button" size="sm" variant="ghost" onClick={() => cambiarEstado(articulo)} cargando={feedback?.cargando}>
                {articulo.activo ? <EyeOff className="size-4" aria-hidden="true" /> : <BookOpen className="size-4" aria-hidden="true" />}
                {articulo.activo ? "Ocultar" : "Activar"}
              </Boton>
            </div>
            <Field>
              <Label htmlFor={`faq-titulo-${articulo.id}`}>Título</Label>
              <input id={`faq-titulo-${articulo.id}`} value={actual?.titulo ?? ""} onChange={(e) => actualizar(articulo.id, "titulo", e.target.value)} maxLength={160} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50" />
            </Field>
            <Field>
              <Label htmlFor={`faq-resumen-${articulo.id}`}>Resumen</Label>
              <textarea id={`faq-resumen-${articulo.id}`} value={actual?.resumen ?? ""} onChange={(e) => actualizar(articulo.id, "resumen", e.target.value)} maxLength={500} rows={2} className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50" />
            </Field>
            <Field>
              <Label htmlFor={`faq-pasos-${articulo.id}`}>Pasos</Label>
              <textarea id={`faq-pasos-${articulo.id}`} value={actual?.pasos ?? ""} onChange={(e) => actualizar(articulo.id, "pasos", e.target.value)} rows={4} className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50" />
              <HelpText>Un paso por línea. Las preguntas diagnósticas se conservan en la definición del artículo.</HelpText>
            </Field>
            {feedback?.error && <ErrorText>{feedback.error}</ErrorText>}
            <div className="flex justify-end">
              <Boton type="button" size="sm" onClick={() => guardar(articulo)} cargando={feedback?.cargando}>
                {feedback?.guardado ? <Check className="size-4" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
                {feedback?.guardado ? "Guardado" : "Guardar artículo"}
              </Boton>
            </div>
          </Card>
        );
      })}
    </section>
  );
}
