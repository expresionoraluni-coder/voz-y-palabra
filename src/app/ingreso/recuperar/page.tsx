"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { ErrorText, Field, HelpText, Input, Label } from "@/components/ui/field";
import Boton from "@/components/ui/button";

export default function RecuperarContrasena() {
  const [correo, setCorreo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviarEnlace(evento: React.FormEvent) {
    evento.preventDefault();
    if (cargando) return;
    setError(null);
    setCargando(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(correo.trim(), {
      redirectTo: `${window.location.origin}/ingreso/recuperar/actualizar`,
    });

    // No se informa si el correo existe: así el formulario no permite
    // enumerar cuentas docentes o la cuenta administrativa.
    if (resetError) {
      setError("No pudimos enviar el enlace. Revisa el correo e inténtalo de nuevo.");
      setCargando(false);
      return;
    }

    setEnviado(true);
    setCargando(false);
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-6 px-6 py-10">
      <Link
        href="/ingreso/profesora"
        className="fixed left-6 top-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver al ingreso
      </Link>

      <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
        <KeyRound className="size-6" aria-hidden="true" />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Recupera tu contraseña</h1>
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Enviaremos un enlace al correo de tu cuenta. No necesitas conocer la contraseña anterior.
        </p>
      </div>

      <Card className="w-full max-w-sm p-6">
        {enviado ? (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <MailCheck className="size-8 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              Si ese correo tiene una cuenta, recibirás un enlace para crear una contraseña nueva. Revisa también la carpeta de correo no deseado.
            </p>
            <Link href="/ingreso/profesora" className="text-sm font-medium text-indigo-600 underline underline-offset-2 dark:text-indigo-400">
              Volver al ingreso
            </Link>
          </div>
        ) : (
          <form onSubmit={enviarEnlace} className="flex flex-col gap-4">
            <Field>
              <Label htmlFor="correoRecuperacion">Correo de tu cuenta</Label>
              <Input
                id="correoRecuperacion"
                required
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                autoComplete="email"
                autoFocus
              />
              <HelpText>Necesitas tener acceso a este correo para completar el cambio.</HelpText>
            </Field>
            {error && <ErrorText>{error}</ErrorText>}
            <Boton type="submit" cargando={cargando} className="w-full">
              {cargando ? "Enviando…" : "Enviar enlace"}
            </Boton>
          </form>
        )}
      </Card>
    </div>
  );
}
