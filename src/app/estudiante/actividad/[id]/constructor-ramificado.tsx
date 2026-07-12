"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, Label, Input, Textarea, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import { similitudTexto } from "@/lib/similitud-texto";

type Seccion = { nombre: string; guia: string };

function contarPalabras(texto: string) {
  return texto.trim().length === 0 ? 0 : texto.trim().split(/\s+/).length;
}

export default function ConstructorRamificado({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: { tema_sugerido: string | null; secciones: Seccion[] };
  respuestaPrevia?: { tema: string; textos: string[] };
}) {
  const router = useRouter();
  const [tema, setTema] = useState(respuestaPrevia?.tema ?? "");
  const [textos, setTextos] = useState<string[]>(
    respuestaPrevia?.textos ?? contenido.secciones.map(() => ""),
  );
  const [cargando, setCargando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function actualizar(i: number, valor: string) {
    setTextos((prev) => prev.map((v, idx) => (idx === i ? valor : v)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardado(false);

    for (let i = 0; i < textos.length; i++) {
      if (contarPalabras(textos[i]) < 8) {
        setError(`Desarrolla un poco más la sección "${contenido.secciones[i].nombre}" antes de guardar.`);
        return;
      }
    }

    for (let i = 0; i < textos.length - 1; i++) {
      if (similitudTexto(textos[i], textos[i + 1]) > 0.75) {
        setError(
          `"${contenido.secciones[i].nombre}" y "${contenido.secciones[i + 1].nombre}" se parecen mucho — revisa que cada sección aporte algo distinto.`,
        );
        return;
      }
    }

    setCargando(true);

    const supabase = createClient();
    const { error: upsertError } = await supabase.from("entregas").upsert(
      {
        estudiante_id: estudianteId,
        actividad_id: actividadId,
        respuesta: { tema, textos },
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
      {contenido.tema_sugerido && (
        <p className="text-sm text-slate-500 dark:text-slate-500">{contenido.tema_sugerido}</p>
      )}
      <Field>
        <Label htmlFor="tema">Tu tema</Label>
        <Input id="tema" required value={tema} onChange={(e) => setTema(e.target.value)} />
      </Field>

      <div className="flex flex-col gap-4">
        {contenido.secciones.map((s, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {i + 1}
              </span>
              {i < contenido.secciones.length - 1 && (
                <span className="mt-1 w-px flex-1 bg-slate-200 dark:bg-slate-800" />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5 pb-1">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{s.nombre}</p>
              {s.guia && <p className="text-xs text-slate-500 dark:text-slate-500">{s.guia}</p>}
              <Textarea
                required
                value={textos[i] ?? ""}
                onChange={(e) => actualizar(i, e.target.value)}
                rows={4}
              />
            </div>
          </div>
        ))}
      </div>

      {error && <ErrorText>{error}</ErrorText>}
      {guardado && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Guardado. Puedes seguir puliendo tu texto cuando quieras.
        </p>
      )}
      <Boton type="submit" cargando={cargando}>
        {cargando ? "Guardando..." : "Guardar mi texto"}
      </Boton>
    </form>
  );
}
