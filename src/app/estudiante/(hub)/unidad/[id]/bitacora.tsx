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
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <NotebookPen className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <p className="text-sm font-medium text-slate-900 dark:text-slate-50">
            ¿Qué aprendizaje esperas alcanzar en esta unidad?
          </p>
        </div>
        <form onSubmit={guardarMeta} className="flex flex-col gap-3">
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
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <NotebookPen className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Lo que esperas aprender</p>
      </div>
      <p className="text-sm italic text-slate-700 dark:text-slate-300">&quot;{metaGuardada}&quot;</p>
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
