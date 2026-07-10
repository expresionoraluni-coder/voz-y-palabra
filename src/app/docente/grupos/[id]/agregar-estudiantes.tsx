"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Field, Label, Textarea, HelpText, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

export default function AgregarEstudiantes({ grupoId }: { grupoId: string }) {
  const router = useRouter();
  const [nombres, setNombres] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agregados, setAgregados] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAgregados(null);

    const lista = nombres
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (lista.length === 0) return;

    setCargando(true);
    const supabase = createClient();

    const { data, error: insertError } = await supabase
      .from("estudiantes")
      .insert(lista.map((nombre) => ({ nombre, grupo_id: grupoId })))
      .select();

    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "Uno o más nombres ya están en este grupo (no se permiten nombres repetidos)."
          : insertError.message,
      );
      setCargando(false);
      return;
    }

    setAgregados(data?.length ?? 0);
    setNombres("");
    setCargando(false);
    router.refresh();
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2">
        <UserPlus className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Agregar estudiantes</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Field>
          <Label htmlFor="nombres">Un nombre por línea</Label>
          <Textarea
            id="nombres"
            value={nombres}
            onChange={(e) => setNombres(e.target.value)}
            rows={5}
            placeholder={"Ana Torres\nLuis Martínez\nSofía Ramírez"}
            className="font-mono"
          />
          <HelpText>Puedes pegar una columna completa copiada desde Excel.</HelpText>
        </Field>
        {error && <ErrorText>{error}</ErrorText>}
        {agregados !== null && (
          <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {agregados} estudiante(s) agregado(s)
          </p>
        )}
        <Boton type="submit" variant="secondary" size="sm" cargando={cargando} className="self-start">
          {cargando ? "Agregando..." : "Agregar"}
        </Boton>
      </form>
    </Card>
  );
}
