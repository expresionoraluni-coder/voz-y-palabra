"use client";

import { useState } from "react";
import { Check, Clipboard } from "lucide-react";
import { Card } from "@/components/ui/card";
import Boton from "@/components/ui/button";

export default function AccesoGrupo({ codigo, nombreGrupo }: { codigo: string; nombreGrupo: string }) {
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
        : `Grupo: ${nombreGrupo}\nCódigo de acceso: ${codigo}\n\nPara entrar a Voz y Palabra:\n1. Abre ${window.location.origin}/ingreso/estudiante\n2. Escribe el código de acceso tal como aparece aquí: ${codigo}\n3. Escribe tu nombre completo igual que en la lista: apellidos primero y después nombres, sin abreviaturas. Puedes escribirlo sin acentos. Ejemplo: GARCIA LOPEZ MARIA.\n4. La primera vez, usa como NIP los últimos 4 dígitos de tu boleta.\n5. Al entrar, cambia ese NIP por uno propio y guárdalo en privado. Si lo olvidas, pide a la profesora que lo reinicie.`;

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
    <Card className="flex flex-wrap items-center gap-2 border-slate-200 bg-white/70 p-3 shadow-none dark:border-slate-800 dark:bg-slate-900/70">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Código de acceso</span>
      <code className="mr-auto font-mono text-base font-bold tracking-widest text-indigo-700 dark:text-indigo-300">{codigo}</code>
      <Boton type="button" variant="ghost" size="sm" onClick={() => copiar("codigo")}>
        {copiado === "codigo" ? <Check className="size-4" aria-hidden="true" /> : <Clipboard className="size-4" aria-hidden="true" />}
        {copiado === "codigo" ? "Copiado" : "Copiar"}
      </Boton>
      <details className="relative">
        <summary className="cursor-pointer rounded-lg px-2 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-slate-800">
          Instrucciones
        </summary>
        <div className="absolute right-0 z-20 mt-2 flex w-80 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:w-96">
          <p className="leading-relaxed text-slate-600 dark:text-slate-400">
            El nombre debe escribirse como en la lista: apellidos primero, después nombres y sin abreviaturas. El NIP inicial son los últimos cuatro dígitos de la boleta.
          </p>
          <Boton type="button" variant="ghost" size="sm" onClick={() => copiar("instrucciones")} className="self-start">
            {copiado === "instrucciones" ? <Check className="size-4" aria-hidden="true" /> : <Clipboard className="size-4" aria-hidden="true" />}
            {copiado === "instrucciones" ? "Instrucciones copiadas" : "Copiar instrucciones"}
          </Boton>
        </div>
      </details>
      {error && (
        <p role="status" className="basis-full text-sm text-amber-800 dark:text-amber-200">
          No se pudo copiar automáticamente. Selecciona el código o las instrucciones y cópialos manualmente.
        </p>
      )}
    </Card>
  );
}
