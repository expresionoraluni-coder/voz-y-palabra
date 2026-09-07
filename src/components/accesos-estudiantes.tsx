"use client";

import { useId, useState } from "react";
import { Check, Clipboard } from "lucide-react";
import Boton from "@/components/ui/button";

export type AccesoEstudiante = {
  id: string;
  nombre: string;
  codigo_activacion: string;
};

export function leerAccesosEstudiantes(valor: unknown): AccesoEstudiante[] | null {
  if (!valor || typeof valor !== "object") return null;
  const accesos = (valor as { accesos?: unknown }).accesos;
  if (!Array.isArray(accesos)) return null;
  const validos = accesos.filter((item): item is AccesoEstudiante => {
    if (!item || typeof item !== "object") return false;
    const acceso = item as Partial<AccesoEstudiante>;
    return typeof acceso.id === "string"
      && typeof acceso.nombre === "string"
      && typeof acceso.codigo_activacion === "string"
      && /^[0-9A-F]{16}$/.test(acceso.codigo_activacion);
  });
  return validos.length === accesos.length ? validos : null;
}

export default function AccesosEstudiantes({
  accesos,
  titulo = "Códigos de acceso",
}: {
  accesos: AccesoEstudiante[];
  titulo?: string;
}) {
  const tituloId = useId();
  const [copiados, setCopiados] = useState(false);
  const [errorCopia, setErrorCopia] = useState(false);
  const texto = accesos
    .map((acceso) => `${acceso.nombre}\t${acceso.codigo_activacion}`)
    .join("\n");

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setErrorCopia(false);
      setCopiados(true);
      window.setTimeout(() => setCopiados(false), 1800);
    } catch {
      setCopiados(false);
      setErrorCopia(true);
    }
  }

  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30" aria-labelledby={tituloId}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={tituloId} className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">{titulo}</h3>
          <p className="mt-1 text-xs leading-relaxed text-emerald-800 dark:text-emerald-200">
            Se muestran una sola vez. Entrega cada código en privado a la persona correspondiente; no compartas la lista completa con el grupo.
          </p>
        </div>
        <Boton type="button" variant="secondary" size="sm" onClick={copiar}>
          {copiados ? <Check className="size-4" aria-hidden="true" /> : <Clipboard className="size-4" aria-hidden="true" />}
          {copiados ? "Copiados" : "Copiar lista"}
        </Boton>
      </div>
      {errorCopia && (
        <p className="mt-2 text-xs text-amber-800 dark:text-amber-200" role="status">
          El navegador no permitió copiar. Selecciona los códigos visibles y cópialos manualmente.
        </p>
      )}
      <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-emerald-200 bg-white dark:border-emerald-900 dark:bg-slate-950">
        <table className="w-full min-w-[360px] text-left text-sm">
          <thead className="sticky top-0 bg-emerald-50 text-xs uppercase tracking-wide text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
            <tr><th className="px-3 py-2">Estudiante</th><th className="px-3 py-2">Código personal</th></tr>
          </thead>
          <tbody>
            {accesos.map((acceso) => (
              <tr key={acceso.id} className="border-t border-emerald-100 dark:border-emerald-900">
                <td className="px-3 py-2 text-slate-800 dark:text-slate-200">{acceso.nombre}</td>
                <td className="px-3 py-2 font-mono font-semibold tracking-wider text-slate-950 dark:text-white">{acceso.codigo_activacion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
