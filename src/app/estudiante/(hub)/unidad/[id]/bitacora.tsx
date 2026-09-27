"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, NotebookPen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Field, Label, Input, HelpText, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import { alternarBitacoraCumplida, guardarBitacoraMeta } from "../../../acciones-reflexiones";
import { useBorradorLocal } from "@/hooks/use-borrador-local";

export default function Bitacora({
  unidadId,
  estudianteId,
  metaPrevia,
  cumplidaPrevia,
  avancePct,
}: {
  unidadId: string;
  estudianteId: string;
  metaPrevia: string | null;
  cumplidaPrevia: boolean;
  avancePct: number;
}) {
  const router = useRouter();
  const [metaGuardada, setMetaGuardada] = useState(metaPrevia);
  const [editando, setEditando] = useState(!metaPrevia);
  const { borrador, guardarBorrador, borrarBorrador } = useBorradorLocal<{
    verbo: string;
    que: string;
    como: string;
  }>({
    estudianteId,
    tipo: "meta-unidad",
    recursoId: unidadId,
    habilitado: !metaPrevia,
  });
  const [verbo, setVerbo] = useState(typeof borrador?.verbo === "string" ? borrador.verbo : "");
  const [que, setQue] = useState(typeof borrador?.que === "string" ? borrador.que : "");
  const [como, setComo] = useState(typeof borrador?.como === "string" ? borrador.como : "");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listoParaGuardar = verbo.trim() && que.trim() && como.trim();

  async function guardarMeta(e: React.FormEvent) {
    e.preventDefault();
    if (cargando) return;
    setError(null);
    setCargando(true);
    const meta = `${verbo.trim()} ${que.trim()}, ${como.trim()}.`;
    try {
      const resultado = await guardarBitacoraMeta(unidadId, meta);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      // Conserva la meta en el estado local mientras router.refresh() trae
      // los datos nuevos. Así no aparece una tarjeta vacía durante el
      // intervalo entre la respuesta de Supabase y el refresco del servidor.
      setMetaGuardada(meta);
      setEditando(false);
      borrarBorrador();
      router.refresh();
    } catch {
      setError("No pudimos guardar tu meta. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  async function alternarCumplida() {
    if (cargando) return;
    setError(null);
    setCargando(true);
    try {
      const resultado = await alternarBitacoraCumplida(unidadId);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      router.refresh();
    } catch {
      setError("No pudimos actualizar tu meta. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  if (editando) {
    return (
      <Card className="relative flex flex-col gap-3 overflow-hidden border-indigo-100 bg-gradient-to-br from-white via-indigo-50/60 to-violet-50/50 p-5 dark:border-indigo-900/70 dark:from-slate-900 dark:via-indigo-950/25 dark:to-violet-950/20">
        <div aria-hidden="true" className="absolute -right-8 -top-8 size-28 rounded-full bg-indigo-200/35 blur-2xl dark:bg-indigo-800/20" />
        <div className="relative flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"><NotebookPen className="size-4" aria-hidden="true" /></span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">Paso 1 de 2</p>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Define qué quieres aprender</p>
          </div>
        </div>
        <p className="relative text-sm leading-relaxed text-slate-600 dark:text-slate-400">Completa las tres partes para crear una meta concreta para esta unidad.</p>
        <form onSubmit={guardarMeta} className="relative flex flex-col gap-3">
          <Field>
            <Label htmlFor="verbo">Verbo</Label>
            <Input
              id="verbo"
              required
              value={verbo}
              onChange={(e) => {
                const siguiente = e.target.value;
                setVerbo(siguiente);
                guardarBorrador({ verbo: siguiente, que, como });
              }}
              placeholder='Ej. "Identificar"'
            />
            <HelpText>En infinitivo (termina en -ar, -er o -ir).</HelpText>
          </Field>
          <Field>
            <Label htmlFor="que">Qué</Label>
            <Input
              id="que"
              required
              value={que}
              onChange={(e) => {
                const siguiente = e.target.value;
                setQue(siguiente);
                guardarBorrador({ verbo, que: siguiente, como });
              }}
              placeholder='Ej. "los elementos del circuito de la comunicación"'
            />
          </Field>
          <Field>
            <Label htmlFor="como">Cómo</Label>
            <Input
              id="como"
              required
              value={como}
              onChange={(e) => {
                const siguiente = e.target.value;
                setComo(siguiente);
                guardarBorrador({ verbo, que, como: siguiente });
              }}
              placeholder='Ej. "analizando conversaciones reales"'
            />
            <HelpText>Verbo + qué + cómo (algo concreto, no &quot;esforzarme más&quot;).</HelpText>
          </Field>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tu borrador se guarda solo en este dispositivo hasta que entregues.
          </p>
          {error && <ErrorText>{error}</ErrorText>}
          <Boton type="submit" size="sm" cargando={cargando} disabled={!listoParaGuardar} className="self-start">
            {cargando ? "Guardando…" : "Guardar"}
          </Boton>
        </form>
      </Card>
    );
  }

  return (
    <Card className="relative flex flex-col gap-3 overflow-hidden border-indigo-100 bg-gradient-to-br from-white via-indigo-50/60 to-violet-50/50 p-5 dark:border-indigo-900/70 dark:from-slate-900 dark:via-indigo-950/25 dark:to-violet-950/20">
      <div className="relative flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"><NotebookPen className="size-4" aria-hidden="true" /></span>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Lo que esperas aprender</p>
      </div>
      <p className="relative rounded-2xl bg-white/65 px-3 py-2.5 text-sm italic text-slate-700 dark:bg-slate-900/55 dark:text-slate-300">&quot;{metaGuardada}&quot;</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">Progreso de la unidad: {avancePct}%</p>
      {error && <ErrorText>{error}</ErrorText>}
      <Boton
        type="button"
        variant={cumplidaPrevia ? "secondary" : "primary"}
        size="sm"
        onClick={alternarCumplida}
        cargando={cargando}
        className="self-start"
      >
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
        {cumplidaPrevia ? "Cumplida" : "Marcar como cumplida"}
      </Boton>
    </Card>
  );
}
