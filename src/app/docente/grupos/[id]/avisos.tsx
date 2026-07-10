"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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
      setError(insertError.message);
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
              <div key={a.id} className="flex gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                <Bell className="mt-0.5 size-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{a.titulo}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{a.mensaje}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
