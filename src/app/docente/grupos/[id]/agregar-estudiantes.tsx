"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, CheckCircle2, AlertCircle, MinusCircle, Plus, Trash2, TableProperties } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { normalizarNombre } from "@/lib/normalizar-nombre";
import { Card } from "@/components/ui/card";
import { Field, Label, Textarea, HelpText, ErrorText, Input } from "@/components/ui/field";
import Boton from "@/components/ui/button";

type Fila = { nombre: string; boleta: string };

function parsearPegado(texto: string): Fila[] {
  // Excel pega columnas separadas por tabulador; si alguien escribe a mano,
  // aceptamos coma como alternativa. El nombre se normaliza aquí mismo
  // (mayúsculas, sin acentos) para que la tabla muestre exactamente lo que
  // se va a guardar — es también el nombre con el que el estudiante entra.
  return texto
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((linea) => {
      const partes = linea.includes("\t") ? linea.split("\t") : linea.split(",");
      return {
        nombre: normalizarNombre(partes[0] ?? ""),
        boleta: (partes[1] ?? "").trim(),
      };
    });
}

function filaValida(fila: Fila) {
  return fila.nombre.trim().length > 0 && fila.boleta.replace(/\D/g, "").length >= 4;
}

export default function AgregarEstudiantes({
  grupoId,
  nombresExistentes,
}: {
  grupoId: string;
  nombresExistentes: string[];
}) {
  const router = useRouter();
  const [pegado, setPegado] = useState("");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agregados, setAgregados] = useState<number | null>(null);

  const yaEnGrupo = new Set(nombresExistentes.map(normalizarNombre));

  // Antes se enviaba el texto pegado directo, a ciegas: si Excel traía las
  // columnas invertidas o una fila sin boleta, no había forma de darse
  // cuenta antes de guardar. Ahora primero se convierte a una tabla
  // revisable y editable, y solo se puede enviar cuando todas las filas
  // están completas.
  function agregarATabla() {
    const nuevas = parsearPegado(pegado);
    if (nuevas.length === 0) return;
    setFilas((prev) => [...prev, ...nuevas]);
    setPegado("");
    setAgregados(null);
    setError(null);
  }

  function actualizarFila(i: number, cambios: Partial<Fila>) {
    setFilas((prev) =>
      prev.map((f, idx) =>
        idx === i
          ? { ...f, ...cambios, ...(cambios.nombre !== undefined ? { nombre: normalizarNombre(cambios.nombre) } : {}) }
          : f,
      ),
    );
    setAgregados(null);
  }

  function quitarFila(i: number) {
    setFilas((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Repetida dentro del mismo pegado (p. ej. copió un rango con renglones
  // de más) — solo la primera aparición cuenta como nueva.
  function esRepetidaEnLote(fila: Fila, i: number) {
    if (!fila.nombre.trim()) return false;
    return filas.findIndex((f) => f.nombre.trim() === fila.nombre.trim()) < i;
  }

  const invalidas = filas.filter((f) => !filaValida(f)).length;
  const excluidas = filas.filter(
    (f, i) => filaValida(f) && (yaEnGrupo.has(f.nombre) || esRepetidaEnLote(f, i)),
  ).length;
  const nuevas = filas.filter(
    (f, i) => filaValida(f) && !yaEnGrupo.has(f.nombre) && !esRepetidaEnLote(f, i),
  );
  const listoParaEnviar = invalidas === 0 && nuevas.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAgregados(null);

    if (invalidas > 0) {
      setError(`Falta el nombre o la boleta (mínimo 4 dígitos) en ${invalidas} fila(s) marcada(s) — corrígelas o quítalas antes de continuar.`);
      return;
    }
    if (nuevas.length === 0) return;

    setCargando(true);
    const supabase = createClient();

    // Solo se envían las filas nuevas: las que ya están en el grupo o se
    // repiten en el mismo pegado se omiten en silencio — así la docente
    // puede volver a pegar el roster completo actualizado de Excel sin que
    // todo el lote falle por los nombres que ya existían.
    const { data, error: rpcError } = await supabase.rpc("agregar_estudiantes_con_boleta", {
      p_grupo_id: grupoId,
      p_estudiantes: nuevas,
    });

    if (rpcError) {
      setError(
        rpcError.message.includes("duplicate key")
          ? "Uno o más nombres o boletas ya están en este grupo (no se permiten repetidos)."
          : rpcError.message,
      );
      setCargando(false);
      return;
    }

    setAgregados(data?.length ?? 0);
    setFilas([]);
    setCargando(false);
    router.refresh();
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2">
        <UserPlus className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Agregar estudiantes</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field>
          <Label htmlFor="pegado">Pega nombre y boleta desde Excel</Label>
          <Textarea
            id="pegado"
            value={pegado}
            onChange={(e) => setPegado(e.target.value)}
            rows={4}
            placeholder={"Ana Torres, 20260001\nLuis Martínez, 20260002\nSofía Ramírez, 20260003"}
            className="font-mono"
          />
          <HelpText>
            Pega dos columnas completas desde Excel (o escribe una fila a mano) y revísalas en la tabla
            antes de guardar. El nombre se ajusta solo a MAYÚSCULAS Y SIN ACENTOS — es el nombre exacto
            con el que el estudiante va a entrar, así no le afecta si escribe su nombre distinto a como
            tú lo capturaste. El NIP inicial de cada estudiante serán los últimos 4 dígitos de su
            boleta — se lo puedes decir así el primer día. Al entrar por primera vez, la plataforma les
            va a pedir que lo cambien por uno que solo ellos sepan. Puedes volver a pegar el roster
            completo más adelante: los nombres que ya estén en el grupo se omiten solos.
          </HelpText>
          <Boton
            type="button"
            variant="secondary"
            size="sm"
            onClick={agregarATabla}
            disabled={!pegado.trim()}
            className="self-start"
          >
            <TableProperties className="size-3.5" aria-hidden="true" />
            Pasar a la tabla
          </Boton>
        </Field>

        {filas.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {filas.length} {filas.length === 1 ? "fila" : "filas"}
              {invalidas > 0 && (
                <span className="ml-1.5 text-amber-600 dark:text-amber-400">
                  · {invalidas} incompleta{invalidas === 1 ? "" : "s"}
                </span>
              )}
              {excluidas > 0 && (
                <span className="ml-1.5 text-slate-400 dark:text-slate-500">
                  · {excluidas} ya existe{excluidas === 1 ? "" : "n"} (se omitirá{excluidas === 1 ? "" : "n"})
                </span>
              )}
              {nuevas.length > 0 && (
                <span className="ml-1.5 text-emerald-600 dark:text-emerald-400">
                  · {nuevas.length} nueva{nuevas.length === 1 ? "" : "s"}
                </span>
              )}
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[420px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60">
                    <th className="w-8 px-2 py-2"></th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Nombre
                    </th>
                    <th className="w-36 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Boleta
                    </th>
                    <th className="w-8 px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((fila, i) => {
                    const valida = filaValida(fila);
                    const excluida = valida && (yaEnGrupo.has(fila.nombre) || esRepetidaEnLote(fila, i));
                    return (
                      <tr key={i} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
                        <td className="px-2 py-1.5 text-center">
                          {!valida ? (
                            <AlertCircle
                              className="mx-auto size-4 shrink-0 text-amber-500"
                              role="img"
                              aria-label="Falta nombre o boleta"
                            />
                          ) : excluida ? (
                            <MinusCircle
                              className="mx-auto size-4 shrink-0 text-slate-300 dark:text-slate-600"
                              role="img"
                              aria-label="Ya existe en el grupo, no se guardará"
                            />
                          ) : (
                            <CheckCircle2
                              className="mx-auto size-4 shrink-0 text-emerald-500"
                              role="img"
                              aria-label="Fila nueva y completa"
                            />
                          )}
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            value={fila.nombre}
                            onChange={(e) => actualizarFila(i, { nombre: e.target.value })}
                            placeholder="NOMBRE"
                            aria-label={`Nombre, fila ${i + 1}`}
                            className={excluida ? "text-slate-400 dark:text-slate-500" : undefined}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <Input
                            value={fila.boleta}
                            onChange={(e) => actualizarFila(i, { boleta: e.target.value })}
                            placeholder="Boleta"
                            inputMode="numeric"
                            aria-label={`Boleta, fila ${i + 1}`}
                          />
                        </td>
                        <td className="px-1 py-1 text-center">
                          <button
                            type="button"
                            onClick={() => quitarFila(i)}
                            aria-label={`Quitar fila ${i + 1}`}
                            className="text-slate-400 transition-colors hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Boton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setFilas((prev) => [...prev, { nombre: "", boleta: "" }])}
              className="self-start"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Agregar fila
            </Boton>
          </div>
        )}

        {error && <ErrorText>{error}</ErrorText>}
        {agregados !== null && (
          <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {agregados} estudiante(s) agregado(s)
          </p>
        )}
        <Boton
          type="submit"
          variant="secondary"
          size="sm"
          cargando={cargando}
          disabled={!listoParaEnviar}
          className="self-start"
        >
          {cargando
            ? "Agregando..."
            : nuevas.length > 0
              ? `Agregar ${nuevas.length} estudiante${nuevas.length === 1 ? "" : "s"}`
              : "Agregar estudiantes"}
        </Boton>
      </form>
    </Card>
  );
}
