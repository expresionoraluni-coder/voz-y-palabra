"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, ArrowLeft, LifeBuoy, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Field, Label, Input, ErrorText, HelpText } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import Alert from "@/components/ui/alert";

const NIP_INCORRECTO = "Tu NIP no es correcto.";
const INTENTOS_PARA_AYUDA = 3;

export default function IngresoEstudiante() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [nip, setNip] = useState("");
  const [nipConfirmar, setNipConfirmar] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intentosNipFallidos, setIntentosNipFallidos] = useState(0);
  const [nipVisible, setNipVisible] = useState(false);
  const [primeraVez, setPrimeraVez] = useState<boolean | null>(null);

  // Si ya sabemos el nombre y el grupo, preguntamos si esta persona ya tiene
  // NIP guardado — así solo pedimos confirmarlo cuando de verdad se está
  // creando por primera vez, no en cada regreso.
  async function revisarPrimeraVez() {
    if (!codigo.trim() || !nombre.trim()) {
      setPrimeraVez(null);
      return;
    }
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("estudiante_tiene_nip", {
      p_codigo: codigo,
      p_nombre: nombre,
    });
    if (rpcError) {
      setPrimeraVez(null);
      return;
    }
    setPrimeraVez(!data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (primeraVez && nip !== nipConfirmar) {
      setError("Los dos NIP no coinciden — revísalos.");
      return;
    }

    setCargando(true);

    const supabase = createClient();

    // Se valida contra el servidor (no solo lo guardado localmente): si la
    // sesión ya no existe de verdad (por ejemplo, quedó "fantasma" en el
    // navegador), esto lo detecta y crea una sesión nueva.
    const { data: usuario, error: usuarioError } = await supabase.auth.getUser();
    if (usuarioError || !usuario.user) {
      const { error: authError } = await supabase.auth.signInAnonymously();
      if (authError) {
        setError("No pudimos iniciar tu sesión, intenta de nuevo.");
        setCargando(false);
        return;
      }
    }

    let { data: resultado, error: rpcError } = await supabase.rpc("ingresar_estudiante", {
      p_codigo: codigo,
      p_nombre: nombre,
      p_nip: nip,
    });

    // Segundo intento de seguridad: si la sesión resultó inválida justo al
    // usarla, se descarta, se crea una nueva y se reintenta una sola vez.
    if (rpcError?.message.includes("foreign key constraint")) {
      await supabase.auth.signOut();
      const { error: retryAuthError } = await supabase.auth.signInAnonymously();
      if (!retryAuthError) {
        ({ data: resultado, error: rpcError } = await supabase.rpc("ingresar_estudiante", {
          p_codigo: codigo,
          p_nombre: nombre,
          p_nip: nip,
        }));
      }
    }

    if (rpcError) {
      setError(rpcError.message);
      setIntentosNipFallidos((n) => (rpcError.message === NIP_INCORRECTO ? n + 1 : n));
      setCargando(false);
      return;
    }

    const nipNuevo = resultado?.[0]?.nip_nuevo;
    router.push(nipNuevo ? "/estudiante/inicio?nip=nuevo" : "/estudiante/inicio");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-6 px-6">
      <Link
        href="/ingreso"
        className="fixed left-6 top-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver
      </Link>

      <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
        <GraduationCap className="size-6" aria-hidden="true" />
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Entrar como estudiante
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
          Sin correo, sin contraseña — solo tu nombre, el código de tu grupo y tu NIP
        </p>
      </div>

      <Card className="w-full max-w-sm p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <Label htmlFor="codigo">Código de grupo</Label>
            <Input
              id="codigo"
              required
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              onBlur={revisarPrimeraVez}
              placeholder="Ej. 1IM4-2026"
              autoComplete="off"
            />
          </Field>
          <Field>
            <Label htmlFor="nombre">Tu nombre (como lo escribió tu profesora)</Label>
            <Input
              id="nombre"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onBlur={revisarPrimeraVez}
              placeholder="Ej. Ana Torres"
              autoComplete="off"
            />
          </Field>
          <Field>
            <Label htmlFor="nip">Tu NIP (4 dígitos)</Label>
            <div className="relative">
              <Input
                id="nip"
                required
                type={nipVisible ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                value={nip}
                onChange={(e) => setNip(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                autoComplete="off"
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setNipVisible((v) => !v)}
                aria-label={nipVisible ? "Ocultar NIP" : "Mostrar NIP"}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:text-slate-200"
              >
                {nipVisible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
              </button>
            </div>
            <HelpText>
              La primera vez que entres, este NIP se guarda para que solo tú puedas volver a usar tu
              nombre. Invéntalo y no lo olvides.
            </HelpText>
          </Field>
          {primeraVez && (
            <Field>
              <Label htmlFor="nipConfirmar">Confirma tu NIP</Label>
              <Input
                id="nipConfirmar"
                required
                type={nipVisible ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                value={nipConfirmar}
                onChange={(e) => setNipConfirmar(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                autoComplete="off"
              />
              {nipConfirmar.length === 4 && nipConfirmar !== nip && (
                <ErrorText>No coincide con el NIP de arriba.</ErrorText>
              )}
            </Field>
          )}
          {error && <ErrorText>{error}</ErrorText>}
          <Boton
            type="submit"
            cargando={cargando}
            disabled={Boolean(primeraVez) && nip.length === 4 && nip !== nipConfirmar}
            className="w-full"
          >
            {cargando ? "Entrando..." : "Entrar"}
          </Boton>
        </form>
      </Card>

      {intentosNipFallidos >= INTENTOS_PARA_AYUDA && (
        <div className="w-full max-w-sm">
          <Alert tono="info" titulo="¿Ya no te acuerdas de tu NIP?">
            <span className="flex items-start gap-1.5">
              <LifeBuoy className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Pídele a tu profesora que lo reinicie desde tu ficha — ella puede hacerlo en un momento, y
              luego podrás crear uno nuevo la próxima vez que entres.
            </span>
          </Alert>
        </div>
      )}
    </div>
  );
}
