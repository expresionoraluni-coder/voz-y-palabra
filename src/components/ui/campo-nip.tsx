"use client";

import { Eye, EyeOff } from "lucide-react";
import { Field, Label, Input } from "@/components/ui/field";

export default function CampoNip({
  id,
  etiqueta,
  valor,
  onChange,
  visible,
  onToggleVisible,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
}) {
  return (
    <Field>
      <Label htmlFor={id}>{etiqueta}</Label>
      <div className="relative">
        <Input
          id={id}
          required
          type={visible ? "text" : "password"}
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          value={valor}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="••••"
          autoComplete="off"
          className="pr-11"
        />
        <button
          type="button"
          onClick={onToggleVisible}
          aria-label={visible ? "Ocultar" : "Mostrar"}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:text-slate-200"
        >
          {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      </div>
    </Field>
  );
}
