"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Field, Label, Textarea, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

function normalizar(texto: string) {
  return texto.trim().toLowerCase().replace(/\s+/g, " ");
}

function contarPalabras(texto: string) {
  return texto.trim().length === 0 ? 0 : texto.trim().split(/\s+/).length;
}

export default function EncontrarCorregir({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: { texto_original: string; pista: string | null };
  respuestaPrevia?: { que_encontraste: string; version_corregida: string };
}) {
  const router = useRouter();
  const [queEncontraste, setQueEncontraste] = useState(
    respuestaPrevia?.que_encontraste ?? "",
  );
  const [versionCorregida, setVersionCorregida] = useState(
    respuestaPrevia?.version_corregida ?? "",
  );
  const [mostrarPista, setMostrarPista] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardado(false);

    if (contarPalabras(queEncontraste) < 4) {
      setError("Cuéntanos con un poco más de detalle qué encontraste mal.");
      return;
    }
    if (normalizar(versionCorregida) === normalizar(contenido.texto_original)) {
      setError("Tu versión corregida es igual al texto original — ¿ya corregiste el error?");
      return;
    }

    setCargando(true);

    const supabase = createClient();
    const { error: upsertError } = await supabase.from("entregas").upsert(
      {
        estudiante_id: estudianteId,
        actividad_id: actividadId,
        respuesta: {
          que_encontraste: queEncontraste,
          version_corregida: versionCorregida,
        },
        estado: "pendiente_revision",
      },
      { onConflict: "estudiante_id,actividad_id" },
    );

    if (upsertError) {
      setError(upsertError.message);
      setCargando(false);
      return;
    }

    setGuardado(true);
    setCargando(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="rounded-xl bg-slate-50 px-4 py-3.5 text-sm leading-relaxed text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
        {contenido.texto_original}
      </div>

      {contenido.pista && !mostrarPista && (
        <button
          type="button"
          onClick={() => setMostrarPista(true)}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          <Lightbulb className="size-4" aria-hidden="true" />
          Mostrar pista
        </button>
      )}
      {contenido.pista && mostrarPista && (
        <p className="flex items-start gap-1.5 text-sm text-slate-600 dark:text-slate-400">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-indigo-500" aria-hidden="true" />
          {contenido.pista}
        </p>
      )}

      <Field>
        <Label htmlFor="que-encontraste">¿Qué encontraste que está mal?</Label>
        <Textarea
          id="que-encontraste"
          required
          value={queEncontraste}
          onChange={(e) => setQueEncontraste(e.target.value)}
          rows={2}
        />
      </Field>

      <Field>
        <Label htmlFor="version-corregida">Tu versión corregida</Label>
        <Textarea
          id="version-corregida"
          required
          value={versionCorregida}
          onChange={(e) => setVersionCorregida(e.target.value)}
          rows={5}
        />
      </Field>

      {error && <ErrorText>{error}</ErrorText>}
      {guardado && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Guardado. Puedes cambiar tu respuesta cuando quieras.
        </p>
      )}
      <Boton type="submit" cargando={cargando}>
        {cargando ? "Guardando..." : "Guardar mi respuesta"}
      </Boton>
    </form>
  );
}
