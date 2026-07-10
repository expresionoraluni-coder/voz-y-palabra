"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { generarCodigoAcceso } from "@/lib/codigo-acceso";
import PageHeader from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Field, Label, Input, HelpText, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

export default function NuevoGrupo() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [cicloEscolar, setCicloEscolar] = useState("");
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
      setError("Tu sesión expiró, vuelve a entrar.");
      setCargando(false);
      return;
    }

    const codigo_acceso = generarCodigoAcceso(nombre);

    const { data, error: insertError } = await supabase
      .from("grupos")
      .insert({
        nombre,
        codigo_acceso,
        ciclo_escolar: cicloEscolar || null,
        docente_id: user.id,
      })
      .select()
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? "No pudimos crear el grupo.");
      setCargando(false);
      return;
    }

    router.push(`/docente/grupos/${data.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-6 py-10">
      <PageHeader
        volverHref="/docente/dashboard"
        titulo="Crear grupo"
        descripcion="El código de acceso se genera automáticamente."
      />
      <Card className="flex flex-col gap-5 p-6">
        <div className="flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
          <Users className="size-5" aria-hidden="true" />
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <Label htmlFor="nombre">Nombre del grupo</Label>
            <Input
              id="nombre"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. 1IM4"
            />
          </Field>
          <Field>
            <Label htmlFor="ciclo">Ciclo escolar (opcional)</Label>
            <Input
              id="ciclo"
              value={cicloEscolar}
              onChange={(e) => setCicloEscolar(e.target.value)}
              placeholder="Ej. 2026-A"
            />
            <HelpText>Te sirve para diferenciar grupos de distintos semestres.</HelpText>
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          <Boton type="submit" cargando={cargando} className="w-full">
            {cargando ? "Creando..." : "Crear grupo"}
          </Boton>
        </form>
      </Card>
    </div>
  );
}
