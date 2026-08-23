"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { ErrorText, Field, HelpText, Input, Label } from "@/components/ui/field";
import Boton from "@/components/ui/button";

export default function ConfigurarMfa({ activo }: { activo: boolean }) {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [factores, setFactores] = useState<Array<{ id: string; status: string; friendly_name?: string | null }>>([]);

  useEffect(() => {
    if (!activo) return;
    const supabase = createClient();
    void supabase.auth.mfa.listFactors().then(({ data }) => {
      setFactores((data?.totp ?? []).map((factor) => ({ id: factor.id, status: factor.status, friendly_name: factor.friendly_name })));
    });
  }, [activo]);

  async function iniciarConfiguracion() {
    if (cargando) return;
    setCargando(true);
    setError(null);
    const supabase = createClient();
    const { data: factoresActuales, error: listaError } = await supabase.auth.mfa.listFactors();
    if (listaError) {
      setError("No pudimos revisar la configuración de seguridad. Intenta de nuevo.");
      setCargando(false);
      return;
    }

    if ((factoresActuales?.totp ?? []).some((factor) => factor.status === "verified")) {
      setError("Tu cuenta ya tiene un segundo factor activo. Recarga la página para verlo.");
      setCargando(false);
      return;
    }

    // Una configuración abandonada no debe acumular secretos pendientes ni
    // competir con el nuevo registro TOTP.
    for (const factor of factoresActuales?.totp ?? []) {
      // Supabase expone el estado pendiente como "unverified" en Auth.
      if (factor.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Voz y Palabra",
    });
    if (enrollError || !data?.totp) {
      setError("No pudimos iniciar la configuración. Intenta de nuevo en un momento.");
      setCargando(false);
      return;
    }

    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setUri(data.totp.uri);
    setCargando(false);
  }

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    if (verificando || !factorId) return;
    const codigoLimpio = codigo.replace(/\s/g, "");
    if (!/^\d{6}$/.test(codigoLimpio)) {
      setError("Escribe el código de 6 dígitos que muestra tu aplicación autenticadora.");
      return;
    }

    setVerificando(true);
    setError(null);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: codigoLimpio });
    if (verifyError) {
      setError("El código no es válido o ya venció. Genera uno nuevo e inténtalo otra vez.");
      setVerificando(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  async function retirarFactor(factorId: string) {
    const verificados = factores.filter((factor) => factor.status === "verified");
    if (verificados.length <= 1) {
      setError("Conserva al menos un factor verificado para no perder el acceso administrativo.");
      return;
    }
    setError(null);
    const { error: unenrollError } = await createClient().auth.mfa.unenroll({ factorId });
    if (unenrollError) {
      setError("No pudimos retirar este autenticador. Confirma el código actual e inténtalo de nuevo.");
      return;
    }
    setFactores((actuales) => actuales.filter((factor) => factor.id !== factorId));
  }

  if (activo) {
    return (
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <p className="font-semibold text-slate-900 dark:text-slate-50">Segundo factor verificado</p>
            <p className="mt-1">No se muestra ni se almacena aquí el secreto del autenticador. Conserva dos dispositivos verificados para contar con recuperación operativa.</p>
          </div>
        </div>
        <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Autenticadores registrados</p>
          <div className="mt-2 flex flex-col gap-2">
            {factores.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Cargando dispositivos…</p>}
            {factores.map((factor, indice) => (
              <div key={factor.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-950/60">
                <span className="text-slate-700 dark:text-slate-300">{factor.friendly_name || `Autenticador ${indice + 1}`} <span className="text-xs text-slate-400">({factor.status === "verified" ? "verificado" : "pendiente"})</span></span>
                {factor.status === "verified" && factores.filter((item) => item.status === "verified").length > 1 && (
                  <button type="button" onClick={() => void retirarFactor(factor.id)} className="text-xs font-medium text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300">Retirar</button>
                )}
              </div>
            ))}
          </div>
        </div>
        {error && <ErrorText>{error}</ErrorText>}
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-5 p-5">
      <div className="flex items-start gap-3">
        <Smartphone className="mt-0.5 size-5 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <p className="font-semibold text-slate-900 dark:text-slate-50">Configura una aplicación autenticadora</p>
          <p className="mt-1">Puedes usar Google Authenticator, Microsoft Authenticator, 1Password u otra aplicación compatible con códigos TOTP.</p>
        </div>
      </div>

      {!factorId ? (
        <Boton type="button" onClick={iniciarConfiguracion} cargando={cargando} className="w-full sm:w-fit">
          {cargando ? "Preparando…" : "Generar configuración segura"}
        </Boton>
      ) : (
        <form onSubmit={verificar} className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/70">
            {qrCode && <Image src={qrCode} alt="Código QR para configurar el autenticador" width={208} height={208} unoptimized className="size-52 rounded-xl bg-white p-2" />}
            <p className="text-center text-sm text-slate-600 dark:text-slate-400">Escanea este código desde tu aplicación autenticadora.</p>
            {uri && (
              <details className="w-full text-xs text-slate-500 dark:text-slate-400">
                <summary className="cursor-pointer text-center font-medium">¿No puedes escanearlo?</summary>
                <p className="mt-2 break-all rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">{uri}</p>
              </details>
            )}
          </div>
          <Field>
            <Label htmlFor="codigoMfaNuevo">Código de confirmación</Label>
            <Input
              id="codigoMfaNuevo"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <HelpText>Escribe el código actual para confirmar que la configuración funciona.</HelpText>
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          <Boton type="submit" cargando={verificando} className="w-full sm:w-fit">
            {verificando ? "Verificando…" : "Activar protección"}
          </Boton>
        </form>
      )}
      {!factorId && error && <ErrorText>{error}</ErrorText>}
    </Card>
  );
}
