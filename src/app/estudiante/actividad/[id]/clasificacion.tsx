"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { useEntregaActividad } from "@/hooks/useEntregaActividad";
import { createClient } from "@/lib/supabase/client";
import { Select, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import { bloquearCopiar } from "@/lib/anti-copiar";

type Elemento = { texto: string; categoria_correcta: string };

function mezclar<T>(arr: T[]): T[] {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export default function Clasificacion({
  actividadId,
  estudianteId,
  contenido,
  respuestaPrevia,
  dosNiveles,
}: {
  actividadId: string;
  estudianteId: string;
  contenido: { categorias: string[]; elementos: Elemento[]; contexto?: string | null };
  respuestaPrevia?: { elegidas: string[] };
  dosNiveles?: boolean;
}) {
  const { cargando, error, setError, guardar } = useEntregaActividad(actividadId, estudianteId);
  const [reiniciando, setReiniciando] = useState(false);
  const [elegidas, setElegidas] = useState<string[]>(
    respuestaPrevia?.elegidas ?? contenido.elementos.map(() => ""),
  );
  // Si ya había una entrega previa, se muestra directo como calificada — si
  // no, alguien podría ver "Era: X" y reenviar corregido para sacar 100%.
  const [resultado, setResultado] = useState<boolean[] | null>(
    respuestaPrevia
      ? contenido.elementos.map((el, i) => el.categoria_correcta === respuestaPrevia.elegidas[i])
      : null,
  );
  const bloqueado = resultado !== null;

  // En las actividades de "dos niveles" (una vez aprobadas, desbloquean su
  // nivel 2) el orden se revuelve una sola vez por carga de página — así no
  // se puede memorizar "la pregunta 3 siempre es X" entre intentos.
  const elementosOrden = useMemo(
    () => {
      const conIndice = contenido.elementos.map((el, i) => ({ ...el, indiceOriginal: i }));
      return dosNiveles ? mezclar(conIndice) : conIndice;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const categoriasOrden = useMemo(
    () => (dosNiveles ? mezclar(contenido.categorias) : contenido.categorias),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function actualizar(indice: number, valor: string) {
    if (bloqueado) return;
    setElegidas((prev) => prev.map((v, i) => (i === indice ? valor : v)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (bloqueado) return;
    setError(null);

    if (elegidas.some((v) => !v)) {
      setError("Clasifica todos los elementos antes de guardar.");
      return;
    }

    const aciertos = contenido.elementos.map((el, i) => el.categoria_correcta === elegidas[i]);
    const puntajeAuto = Math.round(
      (aciertos.filter(Boolean).length / contenido.elementos.length) * 100,
    );

    const ok = await guardar({
      respuesta: {
        elegidas,
        // Copia de texto+respuesta correcta al momento de entregar: si la
        // docente edita la actividad después (reordena/agrega elementos),
        // la matriz de confusión del grupo no debe desalinearse.
        itemsSnapshot: contenido.elementos.map((el) => ({ texto: el.texto, correcta: el.categoria_correcta })),
      },
      estado: "completada",
      puntaje_auto: puntajeAuto,
    });
    if (ok) setResultado(aciertos);
  }

  async function reiniciarPrueba() {
    if (!window.confirm("¿Reiniciar esta prueba? Se borra tu intento actual y la vuelves a resolver desde cero."))
      return;
    setReiniciando(true);
    const supabase = createClient();
    await supabase.from("entregas").delete().eq("actividad_id", actividadId).eq("estudiante_id", estudianteId);
    await supabase
      .from("reflexiones")
      .delete()
      .eq("actividad_id", actividadId)
      .eq("estudiante_id", estudianteId)
      .in("momento", ["prediccion", "cierre"]);
    // Recarga dura (no router.refresh): el contexto de "entrega reciente"
    // guarda su valor inicial una sola vez y no se resincroniza solo con un
    // refresh de Server Components — así se garantiza que la página vuelva
    // a mostrar la predicción desde cero.
    window.location.reload();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {contenido.contexto && (
        <div
          onCopy={bloquearCopiar}
          onContextMenu={(e) => e.preventDefault()}
          className="select-none rounded-xl bg-slate-50 px-4 py-3.5 text-sm leading-relaxed text-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
        >
          {contenido.contexto}
        </div>
      )}
      {elementosOrden.map((el) => {
        const i = el.indiceOriginal;
        return (
          <div
            key={i}
            className="flex flex-col gap-2.5 rounded-xl border border-slate-200 px-4 py-3.5 dark:border-slate-800"
          >
            <p className="text-sm text-slate-900 dark:text-slate-50">{el.texto}</p>
            <Select value={elegidas[i]} disabled={bloqueado} onChange={(e) => actualizar(i, e.target.value)}>
              <option value="">Elige una categoría</option>
              {categoriasOrden.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            {resultado && (
              <p
                className={`flex items-center gap-1.5 text-sm ${
                  resultado[i]
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {resultado[i] ? (
                  <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                ) : (
                  <XCircle className="size-4 shrink-0" aria-hidden="true" />
                )}
                {resultado[i] ? "Correcto" : dosNiveles ? "Incorrecto" : `Era: ${el.categoria_correcta}`}
              </p>
            )}
          </div>
        );
      })}
      {error && <ErrorText>{error}</ErrorText>}
      {!bloqueado && (
        <Boton type="submit" cargando={cargando}>
          {cargando ? "Guardando..." : "Guardar y revisar"}
        </Boton>
      )}
      {dosNiveles && bloqueado && (
        <Boton type="button" variant="secondary" cargando={reiniciando} onClick={reiniciarPrueba}>
          <RotateCcw className="size-4" aria-hidden="true" />
          {reiniciando ? "Reiniciando..." : "Reiniciar prueba"}
        </Boton>
      )}
    </form>
  );
}
