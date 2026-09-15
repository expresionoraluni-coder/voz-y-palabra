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
  actividad_id: string | null;
};

type Actividad = {
  id: string;
  titulo: string;
  unidad_id: string;
};

export default function Eventos({
  grupoId,
  unidades,
  eventos,
  actividades,
}: {
  grupoId: string;
  unidades: { id: string; nombre: string; orden: number }[];
  eventos: Evento[];
  actividades: Actividad[];
}) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<TipoEvento>("examen");
  const [fecha, setFecha] = useState("");
  const [unidadId, setUnidadId] = useState(unidades[0]?.id ?? "");
  const [actividadId, setActividadId] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { borrando, error: errorEliminar, eliminar } = useEliminarFila("eventos");
  const actividadesSinApertura = actividades.filter(
    (actividad) => !eventos.some((evento) => evento.tipo === "apertura_actividad" && evento.actividad_id === actividad.id),
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cargando) return;
    setError(null);
    const actividadApertura = actividadesSinApertura.find((actividad) => actividad.id === actividadId);
    if (tipo === "apertura_actividad" && !actividadApertura) {
      setError("Selecciona la actividad que se abrirá.");
      return;
    }
    if (tipo !== "apertura_actividad" && !titulo.trim()) {
      setError("Escribe el título de la fecha.");
      return;
    }
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
      .insert({
        docente_id: user.id,
        grupo_id: grupoId,
        unidad_id: tipo === "apertura_actividad" ? actividadApertura!.unidad_id : unidadId,
        titulo: tipo === "apertura_actividad" ? actividadApertura!.titulo : titulo.trim(),
        tipo,
        fecha,
        actividad_id: tipo === "apertura_actividad" ? actividadApertura!.id : null,
      });
    if (insertError) {
      setError(mensajeError(insertError));
      setCargando(false);
      return;
    }

    setTitulo("");
    setFecha("");
    setActividadId("");
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
            {tipo !== "apertura_actividad" && (
              <Input
                required
                aria-label="Título del evento"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. Examen de Unidad 2"
              />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field>
              <Select aria-label="Tipo de evento" value={tipo} onChange={(e) => setTipo(e.target.value as TipoEvento)}>
                {Object.entries(TIPOS_EVENTO).map(([valor, { etiqueta }]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </Select>
            </Field>
            {tipo === "apertura_actividad" ? (
              <Field>
                <Select
                  required
                  aria-label="Actividad que se abrirá"
                  value={actividadId}
                  onChange={(e) => setActividadId(e.target.value)}
                >
                  <option value="">Selecciona una actividad</option>
                  {actividadesSinApertura.map((actividad) => (
                    <option key={actividad.id} value={actividad.id}>
                      {actividad.titulo}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : (
              <Field>
                <Select aria-label="Unidad" value={unidadId} onChange={(e) => setUnidadId(e.target.value)}>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>
                      Unidad {u.orden}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field>
              <Input
                required
                type="date"
                aria-label="Fecha"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </Field>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {tipo === "apertura_actividad"
              ? "La actividad quedará disponible para este grupo a partir de esta fecha y permanecerá abierta."
              : "La unidad que elijas le permite a la plataforma sugerir qué repasar antes de esta fecha."}
          </p>
          {error && <ErrorText>{error}</ErrorText>}
          <Boton
            type="submit"
            variant="secondary"
            size="sm"
            cargando={cargando}
            disabled={tipo === "apertura_actividad" ? !actividadesSinApertura.length : !unidadId}
            className="self-start"
          >
            {cargando ? "Guardando…" : "Agregar fecha"}
          </Boton>
        </form>

        {errorEliminar && <ErrorText>{errorEliminar}</ErrorText>}
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
                  <CalendarDays className="size-4 shrink-0 text-slate-400 dark:text-slate-400" aria-hidden="true" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{ev.titulo}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {unidad ? `Unidad ${unidad.orden}` : ""} · {textoFaltan(dias)}
                    </p>
                  </div>
                  <Badge tono={dias < 0 ? "neutral" : "indigo"}>
                    {TIPOS_EVENTO[ev.tipo as TipoEvento]?.etiqueta ?? ev.tipo}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => eliminar(ev.id, `¿Eliminar el evento "${ev.titulo}"?`)}
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
