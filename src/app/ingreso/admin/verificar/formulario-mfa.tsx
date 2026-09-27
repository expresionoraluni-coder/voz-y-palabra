"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { ErrorText, Field, HelpText, Input, Label } from "@/components/ui/field";
import Boton from "@/components/ui/button";

export default function FormularioMfa({ factorId }: { factorId: string }) {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    if (verificando) return;
    setError(null);
    const codigoLimpio = codigo.replace(/\s/g, "");
    if (!/^\d{6}$/.test(codigoLimpio)) {
      setError("Escribe el código de 6 dígitos que muestra tu aplicación autenticadora.");
      return;
    }
    setVerificando(true);
    const supabase = createClient();
    const { error: verificacionError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: codigoLimpio });
    if (verificacionError) {
      setError("El código no es válido o ya venció. Genera uno nuevo e inténtalo otra vez.");
      setVerificando(false);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="auth-shell flex min-h-dvh flex-1 flex-col items-center justify-center gap-6 px-6 py-10">
      <div className="relative z-10 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-700 to-violet-700 text-white shadow-lg shadow-indigo-500/25">
        <ShieldCheck className="size-6" aria-hidden="true" />
      </div>
      <div className="relative z-10 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700 dark:text-indigo-300">Acceso administrativo protegido</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">Confirma tu identidad</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">Abre tu aplicación autenticadora y escribe el código de 6 dígitos para continuar.</p>
      </div>
      <Card className="relative z-10 w-full max-w-sm border border-white/80 bg-white/90 p-6 shadow-xl shadow-indigo-950/10 backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/90">
        <form onSubmit={verificar} className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-xl bg-indigo-50/70 p-3.5 text-sm text-slate-700 dark:bg-indigo-950/30 dark:text-slate-300">
            <KeyRound className="mt-0.5 size-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <p>Este paso protege reportes, estudiantes, grupos y la configuración administrativa.</p>
          </div>
          <Field>
            <Label htmlFor="codigoMfa">Código de seguridad</Label>
            <Input id="codigoMfa" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus />
            <HelpText>El código cambia periódicamente. No lo compartas.</HelpText>
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          <Boton type="submit" cargando={verificando} disabled={codigo.length !== 6} className="w-full">{verificando ? "Comprobando…" : "Entrar al panel"}</Boton>
        </form>
      </Card>
    </main>
  );
}
