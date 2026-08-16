"use client";

import { useState } from "react";
import { Check, Clipboard, Share2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import Boton from "@/components/ui/button";

export default function AccesoGrupo({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState<"codigo" | "instrucciones" | null>(null);
  const [error, setError] = useState(false);

  async function copiarTexto(texto: string) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return;
    }

    const area = document.createElement("textarea");
    area.value = texto;
    area.setAttribute("readonly", "true");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const copio = document.execCommand("copy");
    area.remove();
    if (!copio) throw new Error("El navegador no permitió copiar.");
  }

  async function copiar(tipo: "codigo" | "instrucciones") {
    const texto =
      tipo === "codigo"
        ? codigo
        : `Para entrar a Voz y Palabra:\n1. Abre ${window.location.origin}/ingreso/estudiante\n2. Escribe el código de grupo tal como aparece aquí: ${codigo}\n3. Escribe tu nombre completo igual que en la lista: apellidos primero y después nombres, sin abreviaturas. Puedes escribirlo sin acentos. Ejemplo: GARCIA LOPEZ MARIA.\n4. La primera vez, usa como NIP los últimos 4 dígitos de tu boleta.\n5. Al entrar, cambia ese NIP por uno propio y guárdalo en privado. Si lo olvidas, pide a la profesora que lo reinicie.`;

    setError(false);
    try {
      await copiarTexto(texto);
      setCopiado(tipo);
      window.setTimeout(() => setCopiado(null), 1800);
    } catch {
      setCopiado(null);
      setError(true);
    }
  }

  return (
    <Card className="flex flex-col gap-4 border-indigo-100 bg-indigo-50/60 p-5 dark:border-indigo-900 dark:bg-indigo-950/30">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
          <Share2 className="size-4" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Acceso al grupo</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Comparte estas instrucciones con tu grupo. El nombre debe ir como en la lista: apellidos primero,
            después nombres y sin abreviaturas. El NIP inicial son los últimos 4 dígitos de la boleta.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2.5 dark:border-indigo-800 dark:bg-slate-900">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Código</span>
        <code className="mr-auto font-mono text-lg font-bold tracking-widest text-indigo-700 dark:text-indigo-300">{codigo}</code>
        <Boton type="button" variant="secondary" size="sm" onClick={() => copiar("codigo")}>
          {copiado === "codigo" ? <Check className="size-4" aria-hidden="true" /> : <Clipboard className="size-4" aria-hidden="true" />}
          {copiado === "codigo" ? "Copiado" : "Copiar código"}
        </Boton>
      </div>
      <Boton type="button" variant="ghost" size="sm" onClick={() => copiar("instrucciones")} className="self-start">
        {copiado === "instrucciones" ? <Check className="size-4" aria-hidden="true" /> : <Clipboard className="size-4" aria-hidden="true" />}
        {copiado === "instrucciones" ? "Instrucciones copiadas" : "Copiar instrucciones para el grupo"}
      </Boton>
      {error && (
        <p role="status" className="text-sm text-amber-800 dark:text-amber-200">
          No se pudo copiar automáticamente. Selecciona el código o las instrucciones y cópialos manualmente.
        </p>
      )}
    </Card>
  );
}
