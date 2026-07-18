"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, CheckCircle2, AlertCircle, MinusCircle, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { normalizarNombre } from "@/lib/normalizar-nombre";
import { Card } from "@/components/ui/card";
import { Label, HelpText, ErrorText, Input } from "@/components/ui/field";
import Boton from "@/components/ui/button";

type Fila = { nombre: string; boleta: string };

function filaVacia(): Fila {
  return { nombre: "", boleta: "" };
}

function conContenido(fila: Fila) {
  return fila.nombre.trim().length > 0 || fila.boleta.trim().length > 0;
}

function filaValida(fila: Fila) {
  return fila.nombre.trim().length > 0 && fila.boleta.replace(/\D/g, "").length >= 4;
}

// Garantiza que siempre quede exactamente una fila vacía al final, para que
// la tabla se sienta como Excel: siempre hay dónde seguir escribiendo.
function conFilaVaciaAlFinal(filas: Fila[]): Fila[] {
  const ultima = filas[filas.length - 1];
  return ultima && conContenido(ultima) ? [...filas, filaVacia()] : filas;
}

export default function AgregarEstudiantes({
  grupoId,
  nombresExistentes,
}: {
  grupoId: string;
  nombresExistentes: string[];
}) {
  const router = useRouter();
  const [filas, setFilas] = useState<Fila[]>([filaVacia()]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agregados, setAgregados] = useState<number | null>(null);

  const yaEnGrupo = new Set(nombresExistentes.map(normalizarNombre));

  function actualizarFila(i: number, cambios: Partial<Fila>) {
    setFilas((prev) =>
      conFilaVaciaAlFinal(
        prev.map((f, idx) =>
          idx === i
            ? {
                ...f,
                ...cambios,
                ...(cambios.nombre !== undefined ? { nombre: normalizarNombre(cambios.nombre) } : {}),
              }
            : f,
        ),
      ),
    );
    setAgregados(null);
  }

  function quitarFila(i: number) {
    setFilas((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      return next.length === 0 ? [filaVacia()] : conFilaVaciaAlFinal(next);
    });
  }

  // Pegar en cualquier celda reparte el bloque (como Excel): columnas por
  // tabulador —o coma, si viene de un CSV exportado— y renglones hacia
  // abajo desde la celda donde se pegó, creando filas nuevas si hacen
  // falta. Un valor suelto sin separadores se deja pasar como pegado normal
  // del navegador.
  function manejarPegado(e: React.ClipboardEvent<HTMLInputElement>, filaInicio: number, columna: "nombre" | "boleta") {
    const texto = e.clipboardData.getData("text");
    if (!/[\t\n,]/.test(texto)) return;
    e.preventDefault();

    const lineas = texto
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    setFilas((prev) => {
      const next = [...prev];
      lineas.forEach((linea, offset) => {
        const partes = linea.includes("\t") ? linea.split("\t") : linea.split(",");
        const i = filaInicio + offset;
        while (next.length <= i) next.push(filaVacia());
        const fila = { ...next[i] };
        if (columna === "nombre") {
          fila.nombre = normalizarNombre(partes[0] ?? "");
          if (partes[1] !== undefined) fila.boleta = partes[1].trim();
        } else {
          fila.boleta = (partes[0] ?? "").trim();
        }
        next[i] = fila;
      });
      return conFilaVaciaAlFinal(next);
    });
    setAgregados(null);
    setError(null);
  }

  // Repetida dentro de la misma tabla (p. ej. pegó un rango con renglones
  // de más) — solo la primera aparición cuenta como nueva.
  function esRepetidaEnLote(fila: Fila, i: number) {
    if (!fila.nombre.trim()) return false;
    return filas.findIndex((f) => f.nombre.trim() === fila.nombre.trim()) < i;
  }

  const invalidas = filas.filter((f) => conContenido(f) && !filaValida(f)).length;
  const excluidas = filas.filter(
    (f, i) => filaValida(f) && (yaEnGrupo.has(f.nombre) || esRepetidaEnLote(f, i)),
  ).length;
  const nuevas = filas.filter(
    (f, i) => filaValida(f) && !yaEnGrupo.has(f.nombre) && !esRepetidaEnLote(f, i),
  );
  const conAlgunContenido = filas.some(conContenido);
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
    // repiten en la misma tabla se omiten en silencio — así la docente
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
    setFilas([filaVacia()]);
    setCargando(false);
    router.refresh();
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2">
        <UserPlus className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Agregar estudiantes</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <Label>Nombre y boleta</Label>
        <HelpText>
          Escribe directamente en la tabla, o pega ahí una columna (o toda la tabla) copiada de
          Excel — se reparte solo en las filas y se normaliza a mayúsculas sin acentos. El NIP
          inicial de cada quien son los últimos 4 dígitos de su boleta.
        </HelpText>

        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          {conAlgunContenido ? (
            <>
              {filas.filter(conContenido).length}{" "}
              {filas.filter(conContenido).length === 1 ? "fila" : "filas"}
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
            </>
          ) : (
            "Sin filas todavía"
          )}
        </p>

        <div className="max-h-80 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60">
                <th className="sticky top-0 w-8 border-b border-slate-200 bg-slate-50 px-2 py-2 dark:border-slate-800 dark:bg-slate-800/60"></th>
                <th className="sticky top-0 border-b border-slate-200 bg-slate-50 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                  Nombre
                </th>
                <th className="sticky top-0 w-36 border-b border-slate-200 bg-slate-50 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                  Boleta
                </th>
                <th className="sticky top-0 w-8 border-b border-slate-200 bg-slate-50 px-2 py-2 dark:border-slate-800 dark:bg-slate-800/60"></th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, i) => {
                const llena = conContenido(fila);
                const valida = filaValida(fila);
                const excluida = valida && (yaEnGrupo.has(fila.nombre) || esRepetidaEnLote(fila, i));
                return (
                  <tr key={i} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
                    <td className="px-2 py-1.5 text-center">
                      {!llena ? null : !valida ? (
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
                        onPaste={(e) => manejarPegado(e, i, "nombre")}
                        placeholder={i === 0 ? "Escribe o pega aquí desde Excel" : "Nombre"}
                        aria-label={`Nombre, fila ${i + 1}`}
                        className={excluida ? "text-slate-400 dark:text-slate-500" : undefined}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <Input
                        value={fila.boleta}
                        onChange={(e) => actualizarFila(i, { boleta: e.target.value })}
                        onPaste={(e) => manejarPegado(e, i, "boleta")}
                        placeholder="Boleta"
                        inputMode="numeric"
                        aria-label={`Boleta, fila ${i + 1}`}
                      />
                    </td>
                    <td className="px-1 py-1 text-center">
                      {llena && (
                        <button
                          type="button"
                          onClick={() => quitarFila(i)}
                          aria-label={`Quitar fila ${i + 1}`}
                          className="text-slate-400 transition-colors hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

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
          className="mt-2 self-start"
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
