"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { ErrorText, Field, HelpText, Input, Label } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import { esContrasenaValida, obtenerReglasContrasena } from "@/lib/validar-contrasena";

export default function ActualizarContrasena() {
  const [lista, setLista] = useState(false);
  const [contrasena, setContrasena] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [actualizada, setActualizada] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reglas = obtenerReglasContrasena(contrasena);

  useEffect(() => {
    let activo = true;
    let suscripcion: { unsubscribe: () => void } | null = null;

    (async () => {
      const supabase = createClient();
      const listener = supabase.auth.onAuthStateChange((evento, sesion) => {
        if (activo && evento === "PASSWORD_RECOVERY" && sesion) {
          setLista(true);
          setCargando(false);
        }
      });
      suscripcion = listener.data.subscription;
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      let session = null;

      // createBrowserClient puede procesar automáticamente el código PKCE al
      // leer la URL. Primero usamos esa sesión; solo hacemos el intercambio
      // manual si todavía no existe, para no canjear el mismo código dos veces.
      const { data: sesionInicial } = await supabase.auth.getSession();
      session = sesionInicial.session;

      if (!session && code) {
        const { data: intercambio, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (activo) setError("El enlace ya venció o no es válido. Solicita uno nuevo.");
          if (activo) setCargando(false);
          return;
        }
        session = intercambio.session;
      }

      if (session && code) {
        url.searchParams.delete("code");
        window.history.replaceState({}, "", url.toString());
      }

      if (!activo) return;
      if (!session) {
        setError("El enlace ya venció o no es válido. Solicita uno nuevo.");
      } else {
        setLista(true);
      }
      setCargando(false);
    })();

    return () => {
      activo = false;
      suscripcion?.unsubscribe();
    };
  }, []);

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    if (guardando) return;
    setError(null);
    if (!esContrasenaValida(contrasena)) {
      setError("Tu contraseña todavía no cumple todos los requisitos.");
      return;
    }
    if (contrasena !== confirmacion) {
      setError("Las dos contraseñas no coinciden. Revísalas.");
      return;
    }

    setGuardando(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: contrasena });
    if (updateError) {
      setError("No pudimos actualizar la contraseña. Solicita un enlace nuevo e inténtalo otra vez.");
      setGuardando(false);
      return;
    }

    // Se cierra la sesión de recuperación para obligar a iniciar sesión de
    // nuevo y, si es la cuenta administrativa, completar también el MFA.
    await supabase.auth.signOut({ scope: "local" });
    setActualizada(true);
    setGuardando(false);
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
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Crea una contraseña nueva</h1>
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Elige una contraseña que no compartas con nadie.
        </p>
      </div>

      <Card className="w-full max-w-sm p-6">
        {cargando ? (
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">Comprobando tu enlace…</p>
        ) : actualizada ? (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">Tu contraseña se actualizó. Ahora puedes iniciar sesión con ella.</p>
            <Link href="/ingreso/profesora" className="text-sm font-medium text-indigo-600 underline underline-offset-2 dark:text-indigo-400">
              Ir al ingreso
            </Link>
          </div>
        ) : !lista ? (
          <div className="flex flex-col gap-3">
            <ErrorText>{error ?? "No pudimos validar el enlace."}</ErrorText>
            <Link href="/ingreso/recuperar" className="text-sm font-medium text-indigo-600 underline underline-offset-2 dark:text-indigo-400">
              Solicitar otro enlace
            </Link>
          </div>
        ) : (
          <form onSubmit={guardar} className="flex flex-col gap-4">
            <Field>
              <Label htmlFor="contrasenaNueva">Contraseña nueva</Label>
              <Input
                id="contrasenaNueva"
                required
                type="password"
                minLength={12}
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                autoComplete="new-password"
                autoFocus
              />
              <ul className="space-y-1 text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
                {reglas.map((regla) => (
                  <li key={regla.etiqueta} className={regla.cumple ? "text-emerald-600 dark:text-emerald-400" : undefined}>
                    <span aria-hidden="true" className="mr-1.5">{regla.cumple ? "✓" : "○"}</span>{regla.etiqueta}
                  </li>
                ))}
              </ul>
            </Field>
            <Field>
              <Label htmlFor="confirmarContrasenaNueva">Confirma tu contraseña</Label>
              <Input
                id="confirmarContrasenaNueva"
                required
                type="password"
                minLength={12}
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                autoComplete="new-password"
              />
              <HelpText>La confirmación evita errores al escribirla.</HelpText>
            </Field>
            {error && <ErrorText>{error}</ErrorText>}
            <Boton type="submit" cargando={guardando} className="w-full">
              {guardando ? "Guardando…" : "Guardar contraseña"}
            </Boton>
          </form>
        )}
      </Card>
    </div>
  );
}
