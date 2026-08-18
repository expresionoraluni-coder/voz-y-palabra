"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ADMINISTRADOR_EMAIL } from "@/lib/admin-constantes";
import { Card } from "@/components/ui/card";
import { ErrorText, Field, HelpText, Input, Label } from "@/components/ui/field";
import Boton from "@/components/ui/button";

export default function VerificarAdministrador() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(true);
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || user.is_anonymous === true || user.email?.trim().toLowerCase() !== ADMINISTRADOR_EMAIL) {
        router.replace("/ingreso/profesora");
        return;
      }

      const { data: factores, error: factoresError } = await supabase.auth.mfa.listFactors();
      const factor = factores?.totp?.find((item) => item.status === "verified");
      if (factoresError || !factor) {
        router.replace("/admin/seguridad?configurar=1");
        return;
      }

      if (activo) {
        setFactorId(factor.id);
        setCargando(false);
      }
    })();

    return () => {
      activo = false;
    };
  }, [router]);

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    if (verificando || !factorId) return;
    setError(null);

    const codigoLimpio = codigo.replace(/\s/g, "");
    if (!/^\d{6}$/.test(codigoLimpio)) {
      setError("Escribe el código de 6 dígitos que muestra tu aplicación autenticadora.");
      return;
    }

    setVerificando(true);
    const supabase = createClient();
    const { error: verificacionError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: codigoLimpio,
    });

    if (verificacionError) {
      setError("El código no es válido o ya venció. Genera uno nuevo e inténtalo otra vez.");
      setVerificando(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">Comprobando la seguridad de tu cuenta…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-6 px-6">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
        <ShieldCheck className="size-6" aria-hidden="true" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Acceso administrativo protegido</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Confirma tu identidad</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Abre tu aplicación autenticadora y escribe el código de 6 dígitos para continuar.
        </p>
      </div>

      <Card className="w-full max-w-sm p-6">
        <form onSubmit={verificar} className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-xl bg-indigo-50/70 p-3.5 text-sm text-slate-700 dark:bg-indigo-950/30 dark:text-slate-300">
            <KeyRound className="mt-0.5 size-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <p>Este paso protege reportes, estudiantes, grupos y la configuración administrativa.</p>
          </div>
          <Field>
            <Label htmlFor="codigoMfa">Código de seguridad</Label>
            <Input
              id="codigoMfa"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
              autoFocus
            />
            <HelpText>El código cambia periódicamente. No lo compartas.</HelpText>
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          <Boton type="submit" cargando={verificando} className="w-full">
            {verificando ? "Comprobando…" : "Entrar al panel"}
          </Boton>
        </form>
      </Card>
    </div>
  );
}
