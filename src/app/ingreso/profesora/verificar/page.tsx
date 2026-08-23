"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { existePerfilDocente } from "@/lib/supabase/asegurar-perfil-docente";
import { mensajeError } from "@/lib/mensaje-error";
import { Card } from "@/components/ui/card";
import { Field, Label, Input, ErrorText, HelpText } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import { comprobarAdministradorProvisionado } from "../../admin/acciones";

export default function VerificarDocente() {
  const router = useRouter();
  const [estadoCarga, setEstadoCarga] = useState<"cargando" | "listo" | "error">("cargando");
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

      if (!user || user.is_anonymous === true) {
        router.replace("/ingreso/profesora");
        return;
      }

      if (await comprobarAdministradorProvisionado()) {
        router.replace("/admin");
        return;
      }

      const { existe: tienePerfil, error: perfilError } = await existePerfilDocente(supabase, user.id);
      if (perfilError) {
        setError("No pudimos comprobar tu perfil docente. Recarga la página para intentarlo de nuevo.");
        setEstadoCarga("error");
        return;
      }
      if (tienePerfil) {
        router.replace("/docente/dashboard");
        return;
      }

      setEstadoCarga("listo");
    })();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cargando) return;
    setError(null);
    setCargando(true);

    const supabase = createClient();
    const { data: mensajeRpc, error: rpcError } = await supabase.rpc("crear_perfil_docente", {
      p_nombre: nombre,
      p_codigo_invitacion: codigoInvitacion,
    });

    if (rpcError) {
      setError(mensajeError(rpcError, {
        "42501": "No pudimos comprobar tu invitación. Intenta de nuevo.",
        "429": "Se intentó demasiadas veces. Espera un momento y vuelve a intentarlo.",
      }));
      setCargando(false);
      return;
    }

    // Código incorrecto y "ya bloqueado" ya no llegan como rpcError: la
    // función los devuelve como texto para que el contador de intentos
    // fallidos sí quede guardado (una excepción deshace todo lo hecho en
    // esa llamada, incluido el conteo).
    if (mensajeRpc) {
      setError(mensajeRpc);
      setCargando(false);
      return;
    }

    router.push("/docente/dashboard");
    router.refresh();
  }

  if (estadoCarga === "cargando") {
    return (
      <div className="flex min-h-dvh flex-1 items-center justify-center px-6 py-10">
        <p className="text-sm text-slate-500 dark:text-slate-400">Cargando tu verificación…</p>
      </div>
    );
  }

  if (estadoCarga === "error") {
    return (
      <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <Card className="w-full max-w-sm p-6">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <Boton type="button" className="mt-4 w-full" onClick={() => window.location.reload()}>
            Intentar de nuevo
          </Boton>
        </Card>
      </div>
    );
  }

  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-6 px-6 py-10">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
        <KeyRound className="size-6" aria-hidden="true" />
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Confirma tu acceso docente
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
          Tu correo ya quedó confirmado. Para entrar al panel necesitamos confirmar tu autorización docente.
        </p>
      </div>

      <Card className="w-full max-w-sm p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <Label htmlFor="nombre">Nombre para mostrar</Label>
            <Input id="nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" />
            <HelpText>Escribe el nombre con el que quieres identificar tu panel.</HelpText>
          </Field>
          <Field>
            <Label htmlFor="codigoInvitacion">Código de invitación</Label>
            <Input
              id="codigoInvitacion"
              required
              value={codigoInvitacion}
              onChange={(e) => setCodigoInvitacion(e.target.value)}
              autoComplete="off"
            />
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          <Boton type="submit" cargando={cargando} className="w-full">
            {cargando ? "Comprobando…" : "Entrar al panel"}
          </Boton>
        </form>
      </Card>
    </main>
  );
}
