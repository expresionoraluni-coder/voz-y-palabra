"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { existePerfilDocente } from "@/lib/supabase/asegurar-perfil-docente";
import { Card } from "@/components/ui/card";
import { Field, Label, Input, ErrorText, HelpText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

export default function VerificarDocente() {
  const router = useRouter();
  const [listo, setListo] = useState(false);
  const [nombre, setNombre] = useState("");
  const [codigoInvitacion, setCodigoInvitacion] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/ingreso/profesora");
        return;
      }

      const tienePerfil = await existePerfilDocente(supabase, user.id);
      if (tienePerfil) {
        router.replace("/docente/dashboard");
        return;
      }

      setListo(true);
    })();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const supabase = createClient();
    const { data: mensajeError, error: rpcError } = await supabase.rpc("crear_perfil_docente", {
      p_nombre: nombre,
      p_codigo_invitacion: codigoInvitacion,
    });

    if (rpcError) {
      setError(rpcError.message);
      setCargando(false);
      return;
    }

    // Código incorrecto y "ya bloqueado" ya no llegan como rpcError: la
    // función los devuelve como texto para que el contador de intentos
    // fallidos sí quede guardado (una excepción deshace todo lo hecho en
    // esa llamada, incluido el conteo).
    if (mensajeError) {
      setError(mensajeError);
      setCargando(false);
      return;
    }

    router.push("/docente/dashboard");
    router.refresh();
  }

  if (!listo) return null;

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-6 px-6">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
        <KeyRound className="size-6" aria-hidden="true" />
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Verifica tu acceso
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
          Tu correo ya quedó confirmado. Falta el código de invitación de profesoras.
        </p>
      </div>

      <Card className="w-full max-w-sm p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <Label htmlFor="nombre">Tu nombre</Label>
            <Input id="nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Field>
          <Field>
            <Label htmlFor="codigoInvitacion">Código de invitación de profesoras</Label>
            <Input
              id="codigoInvitacion"
              required
              value={codigoInvitacion}
              onChange={(e) => setCodigoInvitacion(e.target.value)}
              autoComplete="off"
            />
            <HelpText>Te lo compartió quien coordina el piloto. No es tu contraseña de correo.</HelpText>
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          <Boton type="submit" cargando={cargando} className="w-full">
            {cargando ? "Verificando..." : "Entrar al panel"}
          </Boton>
        </form>
      </Card>
    </div>
  );
}
