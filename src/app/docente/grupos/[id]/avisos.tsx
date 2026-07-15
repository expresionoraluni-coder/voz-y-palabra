"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/mensaje-error";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

type Aviso = { id: string; titulo: string; mensaje: string; created_at: string };

export default function Avisos({
  grupoId,
  avisos,
}: {
  grupoId: string;
  avisos: Aviso[];
}) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);

  async function eliminar(id: string) {
    setBorrando(id);
    const supabase = createClient();
    await supabase.from("avisos").delete().eq("id", id);
    setBorrando(null);
    router.refresh();
  }

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
      .from("avisos")
      .insert({ docente_id: user.id, grupo_id: grupoId, titulo, mensaje });
    if (insertError) {
      setError(mensajeError(insertError));
      setCargando(false);
      return;
    }

    setTitulo("");
    setMensaje("");
    setCargando(false);
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Avisos</h2>
      <Card className="flex flex-col gap-4 p-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field>
            <Input
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título"
            />
          </Field>
          <Field>
            <Textarea
              required
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={2}
              placeholder="Mensaje"
            />
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          <Boton type="submit" variant="secondary" size="sm" cargando={cargando} className="self-start">
            {cargando ? "Publicando..." : "Publicar aviso"}
          </Boton>
        </form>

        {avisos.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            {avisos.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                <Bell className="mt-0.5 size-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{a.titulo}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{a.mensaje}</p>
                </div>
                <button
                  type="button"
                  onClick={() => eliminar(a.id)}
                  disabled={borrando === a.id}
                  aria-label={`Eliminar aviso ${a.titulo}`}
                  className="shrink-0 text-slate-300 transition-colors hover:text-red-500 disabled:opacity-50 dark:text-slate-600 dark:hover:text-red-400"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
