"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/mensaje-error";
import { useEliminarFila } from "@/hooks/useEliminarFila";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import { TIPOS_EVENTO, TipoEvento, diasFaltantes, textoFaltan } from "@/lib/eventos";

type Evento = {
  id: string;
  titulo: string;
  tipo: string;
  fecha: string;
  unidad_id: string;
};

export default function Eventos({
  grupoId,
  unidades,
  eventos,
}: {
  grupoId: string;
  unidades: { id: string; nombre: string; orden: number }[];
  eventos: Evento[];
}) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<TipoEvento>("examen");
  const [fecha, setFecha] = useState("");
  const [unidadId, setUnidadId] = useState(unidades[0]?.id ?? "");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { borrando, eliminar } = useEliminarFila("eventos");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Tu sesión expiró.");
      setCargando(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("eventos")
      .insert({ docente_id: user.id, grupo_id: grupoId, unidad_id: unidadId, titulo, tipo, fecha });
    if (insertError) {
      setError(mensajeError(insertError));
      setCargando(false);
      return;
    }

    setTitulo("");
    setFecha("");
    setCargando(false);
    router.refresh();
  }

  const ordenados = [...eventos].sort((a, b) => a.fecha.localeCompare(b.fecha));

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
        Fechas importantes
      </h2>
      <Card className="flex flex-col gap-4 p-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field>
            <Input
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Examen de Unidad 2"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field>
              <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoEvento)}>
                {Object.entries(TIPOS_EVENTO).map(([valor, { etiqueta }]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <Select value={unidadId} onChange={(e) => setUnidadId(e.target.value)}>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    Unidad {u.orden}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <Input required type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </Field>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            La unidad que elijas es lo que le permite a la plataforma sugerirle a tus estudiantes qué
            repasar antes de esta fecha.
          </p>
          {error && <ErrorText>{error}</ErrorText>}
          <Boton
            type="submit"
            variant="secondary"
            size="sm"
            cargando={cargando}
            disabled={!unidadId}
            className="self-start"
          >
            {cargando ? "Guardando..." : "Agregar fecha"}
          </Boton>
        </form>

        {ordenados.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            {ordenados.map((ev) => {
              const unidad = unidades.find((u) => u.id === ev.unidad_id);
              const dias = diasFaltantes(ev.fecha);
              return (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60"
                >
                  <CalendarDays className="size-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{ev.titulo}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      {unidad ? `Unidad ${unidad.orden}` : ""} · {textoFaltan(dias)}
                    </p>
                  </div>
                  <Badge tono={dias < 0 ? "neutral" : "indigo"}>
                    {TIPOS_EVENTO[ev.tipo as TipoEvento]?.etiqueta ?? ev.tipo}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => eliminar(ev.id)}
                    disabled={borrando === ev.id}
                    aria-label={`Eliminar ${ev.titulo}`}
                    className="text-slate-300 transition-colors hover:text-red-500 disabled:opacity-50 dark:text-slate-600 dark:hover:text-red-400"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </section>
  );
}
