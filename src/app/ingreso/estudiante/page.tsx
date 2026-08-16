"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  LifeBuoy,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Field, Label, Input, ErrorText, HelpText } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import Alert from "@/components/ui/alert";

function mensajeErrorIngreso(mensaje: string): string {
  const texto = mensaje.toLowerCase();
  if (texto.includes("demasiados intentos")) return mensaje;
  if (texto.includes("nip debe ser de 4 dígitos")) return "Tu NIP debe tener exactamente 4 números.";
  if (texto.includes("sesión inválida")) return "Tu sesión caducó. Intenta entrar de nuevo.";
  return "No pudimos validar tus datos. Revisa el código, tu nombre y tu NIP.";
}

export default function IngresoEstudiante() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [nip, setNip] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nipVisible, setNipVisible] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cargando) return;
    setError(null);

    const nombreLimpio = nombre.trim().replace(/\s+/g, " ");
    if (codigo.trim().length === 0) {
      setError("Escribe el código de tu grupo tal como te lo compartieron.");
      return;
    }
    if (codigo.trim().length > 64) {
      setError("El código de tu grupo no puede tener más de 64 caracteres.");
      return;
    }
    if (nombreLimpio.split(" ").length < 2) {
      setError("Escribe tu nombre completo: primero tus apellidos y después tus nombres.");
      return;
    }
    if (!/^\d{4}$/.test(nip)) {
      setError("Tu NIP debe tener exactamente 4 números.");
      return;
    }

    setCargando(true);

    const supabase = createClient();

    // Se valida contra el servidor (no solo lo guardado localmente): si la
    // sesión ya no existe de verdad (por ejemplo, quedó "fantasma" en el
    // navegador), esto lo detecta y crea una sesión nueva. También se exige
    // que la sesión existente sea anónima: si en este navegador quedó
    // abierta la sesión real de una docente (p. ej. una demo en un equipo
    // compartido que no cerró sesión), reusarla ligaría al estudiante con
    // la cuenta de la docente en vez de una identidad propia — heredando
    // sin querer sus permisos.
    const { data: usuario, error: usuarioError } = await supabase.auth.getUser();
    if (usuarioError || !usuario.user || !usuario.user.is_anonymous) {
      if (usuario?.user && !usuario.user.is_anonymous) {
        await supabase.auth.signOut();
      }
      const { error: authError } = await supabase.auth.signInAnonymously();
      if (authError) {
        setError("No pudimos iniciar tu sesión, intenta de nuevo.");
        setCargando(false);
        return;
      }
    }

    let { data: resultado, error: rpcError } = await supabase.rpc("ingresar_estudiante", {
      p_codigo: codigo.trim(),
      p_nombre: nombreLimpio,
      p_nip: nip,
    });

    // Segundo intento de seguridad: si la sesión resultó inválida justo al
    // usarla, se descarta, se crea una nueva y se reintenta una sola vez.
    if (rpcError?.message.includes("foreign key constraint")) {
      await supabase.auth.signOut();
      const { error: retryAuthError } = await supabase.auth.signInAnonymously();
      if (!retryAuthError) {
        ({ data: resultado, error: rpcError } = await supabase.rpc("ingresar_estudiante", {
          p_codigo: codigo.trim(),
          p_nombre: nombreLimpio,
          p_nip: nip,
        }));
      }
    }

    if (rpcError) {
      setError(mensajeErrorIngreso(rpcError.message));
      setCargando(false);
      return;
    }

    // NIP incorrecto y "ya bloqueado" ya no llegan como rpcError: la función
    // los devuelve como dato para que el contador de intentos fallidos sí
    // quede guardado (una excepción deshace todo lo hecho en esa llamada).
    const fila = resultado?.[0];
    if (fila?.error) {
      setError(mensajeErrorIngreso(fila.error));
      setCargando(false);
      return;
    }

    router.push(fila?.nip_nuevo ? "/estudiante/inicio?nip=nuevo" : "/estudiante/inicio");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-6 px-6 py-10">
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
          No necesitas correo ni contraseña. Solo tu nombre, el código de tu grupo y tu NIP.
        </p>
      </div>

      <Card className="w-full max-w-sm p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <Label htmlFor="codigo">Código de grupo</Label>
            <Input
              id="codigo"
              required
              maxLength={64}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="Ej. 1IM4-2026"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-describedby="codigo-ayuda"
            />
            <HelpText id="codigo-ayuda">Incluye todos los caracteres y el guion. El sistema ignora espacios al inicio y al final.</HelpText>
          </Field>
          <Field>
            <Label htmlFor="nombre">Tu nombre completo</Label>
            <Input
              id="nombre"
              required
              maxLength={200}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. GARCIA LOPEZ MARIA"
              autoComplete="off"
              autoCapitalize="words"
              spellCheck={false}
              aria-describedby="nombre-ayuda"
            />
            <HelpText id="nombre-ayuda">Apellidos primero, después nombres, tal como aparece en la lista. Sin abreviaturas. Mayúsculas, minúsculas y acentos no cambian el resultado.</HelpText>
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
                aria-describedby="nip-ayuda"
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
            <HelpText id="nip-ayuda">Primera vez: últimos 4 dígitos de tu boleta. Después de entrar tendrás que cambiarlo por uno propio de cuatro números.</HelpText>
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          <Boton type="submit" cargando={cargando} className="w-full">
            {cargando ? "Entrando..." : "Entrar"}
          </Boton>
        </form>
      </Card>

      <div className="w-full max-w-sm">
        <Alert tono="info" titulo="¿Olvidaste tu NIP?">
          <span className="flex items-start gap-1.5">
            <LifeBuoy className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Pídele a tu profesora que lo reinicie desde tu ficha. Te dará un NIP temporal para entrar;
            después la plataforma te pedirá crear uno nuevo. No lo compartas en el chat del grupo.
          </span>
        </Alert>
      </div>

      <p className="flex items-center gap-1.5 text-center text-xs text-slate-500 dark:text-slate-400">
        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        No necesitas correo ni contraseña para entrar como estudiante.
      </p>
    </div>
  );
}
