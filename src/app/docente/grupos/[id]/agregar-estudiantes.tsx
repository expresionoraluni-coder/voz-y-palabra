"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Field, Label, Textarea, HelpText, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

function parsearFila(linea: string): { nombre: string; boleta: string } | null {
  // Excel pega columnas separadas por tabulador; si alguien escribe a mano,
  // aceptamos coma como alternativa.
  const partes = linea.includes("\t") ? linea.split("\t") : linea.split(",");
  const nombre = (partes[0] ?? "").trim();
  const boleta = (partes[1] ?? "").trim();
  if (!nombre) return null;
  return { nombre, boleta };
}

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
      .map(parsearFila)
      .filter((f): f is { nombre: string; boleta: string } => f !== null);

    if (lista.length === 0) return;

    const sinBoleta = lista.find((f) => f.boleta.length < 4);
    if (sinBoleta) {
      setError(`Falta la boleta de "${sinBoleta.nombre}" (mínimo 4 dígitos) — su NIP inicial se genera de ahí.`);
      return;
    }

    setCargando(true);
    const supabase = createClient();

    const { data, error: rpcError } = await supabase.rpc("agregar_estudiantes_con_boleta", {
      p_grupo_id: grupoId,
      p_estudiantes: lista,
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
          <Label htmlFor="nombres">Nombre y boleta, uno por línea</Label>
          <Textarea
            id="nombres"
            value={nombres}
            onChange={(e) => setNombres(e.target.value)}
            rows={5}
            placeholder={"Ana Torres, 20260001\nLuis Martínez, 20260002\nSofía Ramírez, 20260003"}
            className="font-mono"
          />
          <HelpText>
            Puedes pegar dos columnas completas copiadas desde Excel (nombre y boleta). Su NIP inicial
            serán los últimos 4 dígitos de la boleta — se lo puedes decir así el primer día, y ellos lo
            pueden cambiar si lo olvidan pidiéndote que se los reinicies.
          </HelpText>
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
