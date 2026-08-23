"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserRound, ArrowLeft, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { existePerfilDocente } from "@/lib/supabase/asegurar-perfil-docente";
import { mensajeErrorAuth } from "@/lib/mensaje-error";
import { esContrasenaValida, obtenerReglasContrasena } from "@/lib/validar-contrasena";
import { Card } from "@/components/ui/card";
import { Field, Label, Input, ErrorText, HelpText } from "@/components/ui/field";
import Boton from "@/components/ui/button";
import { comprobarAdministradorProvisionado } from "../admin/acciones";

export default function IngresoProfesora() {
  const router = useRouter();
  const [modo, setModo] = useState<"entrar" | "crear">("entrar");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [contrasenaConfirmar, setContrasenaConfirmar] = useState("");
  const [codigoInvitacion, setCodigoInvitacion] = useState("");
  const [codigoListo, setCodigoListo] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avisoConfirmacion, setAvisoConfirmacion] = useState(false);
  const reglasContrasena = obtenerReglasContrasena(contrasena);
  const contrasenaValida = esContrasenaValida(contrasena);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cargando) return;
    setError(null);
    setAvisoConfirmacion(false);

    if (modo === "crear" && codigoListo && contrasena !== contrasenaConfirmar) {
      setError("Las dos contraseñas no coinciden. Revísalas.");
      return;
    }

    if (modo === "crear" && codigoListo && !contrasenaValida) {
      setError("Tu contraseña todavía no cumple todos los requisitos.");
      return;
    }

    setCargando(true);

    const supabase = createClient();

    if (modo === "entrar") {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: correo,
        password: contrasena,
      });
      if (authError || !data.user) {
        setError(mensajeErrorAuth(authError, "entrar"));
        setCargando(false);
        return;
      }

      const esAdministrador = await comprobarAdministradorProvisionado();
      if (esAdministrador) {
        const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalError) {
          await supabase.auth.signOut();
          setError("No pudimos comprobar la seguridad de la cuenta. Intenta de nuevo.");
          setCargando(false);
          return;
        }

        router.push(aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2" ? "/ingreso/admin/verificar" : "/admin");
        router.refresh();
        return;
      }

      const { existe: tienePerfil, error: perfilError } = await existePerfilDocente(supabase, data.user.id);
      if (perfilError) {
        setError("No pudimos comprobar tu perfil docente. Intenta de nuevo.");
        setCargando(false);
        return;
      }
      router.push(tienePerfil ? "/docente/dashboard" : "/ingreso/profesora/verificar");
      router.refresh();
      return;
    }

    if (!codigoListo) {
      const longitudCodigo = codigoInvitacion.trim().length;
      if (longitudCodigo < 4 || longitudCodigo > 64) {
        setError("Escribe el código de invitación para continuar.");
        setCargando(false);
        return;
      }
      const { data: codigoValido, error: codigoError } = await supabase.rpc("validar_codigo_invitacion", {
        p_codigo: codigoInvitacion.trim(),
      });
      if (codigoError || codigoValido !== true) {
        setError("El código de invitación no es correcto o ya alcanzó el límite de intentos.");
        setCargando(false);
        return;
      }
      setCodigoListo(true);
      setCargando(false);
      return;
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email: correo,
      password: contrasena,
      options: {
        data: { codigo_invitacion_docente: codigoInvitacion.trim() },
      },
    });
    if (authError || !data.user) {
      setError(mensajeErrorAuth(authError, "crear"));
      setCargando(false);
      return;
    }

    if (!data.session) {
      setAvisoConfirmacion(true);
      setCargando(false);
      return;
    }

    router.push("/ingreso/profesora/verificar");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-start gap-6 overflow-y-auto px-6 py-12 sm:justify-center">
      <Link
        href="/ingreso"
        className="fixed left-6 top-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver
      </Link>

      <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
        <UserRound className="size-6" aria-hidden="true" />
      </div>

      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        {modo === "entrar" ? "Iniciar sesión" : "Crear cuenta de profesora"}
      </h1>

      <Card className="w-full max-w-sm p-6">
        {avisoConfirmacion ? (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <MailCheck className="size-8 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Te enviamos un correo a <strong className="text-slate-900 dark:text-slate-50">{correo}</strong>{" "}
              para confirmar tu cuenta. Ábrelo y luego vuelve aquí a iniciar sesión.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {modo === "crear" && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-3.5 py-3 text-sm text-slate-700 dark:border-indigo-900/70 dark:bg-indigo-950/30 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-slate-50">Antes de comenzar</p>
                <p className="mt-1 leading-relaxed">
                  Primero comprueba tu código de invitación. Después podrás registrar el correo y la contraseña con los que entrarás al panel.
                </p>
              </div>
            )}
            {modo === "crear" && (
              <Field>
                <Label htmlFor="codigoInvitacion">Código de invitación</Label>
                <Input
                  id="codigoInvitacion"
                  required
                  value={codigoInvitacion}
                  onChange={(e) => {
                    setCodigoInvitacion(e.target.value);
                    setCodigoListo(false);
                  }}
                  autoComplete="off"
                  disabled={codigoListo}
                />
                {codigoListo && <HelpText>Código capturado. Ahora registra tus datos de acceso.</HelpText>}
              </Field>
            )}
            {(modo === "entrar" || codigoListo) && (
              <>
                <Field>
                  <Label htmlFor="correo">Correo</Label>
                  <Input
                    id="correo"
                    required
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    autoComplete="email"
                  />
                </Field>
                <Field>
                  <Label htmlFor="contrasena">Contraseña</Label>
                  <Input
                    id="contrasena"
                    required
                    type="password"
                    minLength={modo === "crear" ? 12 : undefined}
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    autoComplete={modo === "entrar" ? "current-password" : "new-password"}
                  />
                  {modo === "crear" && (
                    <div className="space-y-2" aria-live="polite">
                      <HelpText>Usa una contraseña que no compartas con nadie.</HelpText>
                      <ul className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        {reglasContrasena.map((regla) => (
                          <li key={regla.etiqueta} className={regla.cumple ? "text-emerald-600 dark:text-emerald-400" : undefined}>
                            <span aria-hidden="true" className="mr-1.5">
                              {regla.cumple ? "✓" : "○"}
                            </span>
                            {regla.etiqueta}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Field>
                {modo === "crear" && (
                  <Field>
                    <Label htmlFor="contrasenaConfirmar">Confirma tu contraseña</Label>
                    <Input
                      id="contrasenaConfirmar"
                      required
                      type="password"
                      minLength={12}
                      value={contrasenaConfirmar}
                      onChange={(e) => setContrasenaConfirmar(e.target.value)}
                      autoComplete="new-password"
                    />
                    {contrasenaConfirmar.length > 0 && contrasenaConfirmar !== contrasena && (
                      <ErrorText>No coincide con la contraseña de arriba.</ErrorText>
                    )}
                  </Field>
                )}
              </>
            )}
            {error && <ErrorText>{error}</ErrorText>}
            <Boton
              type="submit"
              cargando={cargando}
              disabled={
                modo === "crear" &&
                codigoListo &&
                (!contrasenaValida || (contrasenaConfirmar.length > 0 && contrasenaConfirmar !== contrasena))
              }
              className="w-full"
            >
              {cargando
                ? "Un momento…"
                : modo === "entrar"
                  ? "Entrar"
                  : codigoListo
                    ? "Crear cuenta"
                    : "Continuar"}
            </Boton>
            {modo === "entrar" && (
              <Link
                href="/ingreso/recuperar"
                className="text-center text-sm text-slate-500 underline underline-offset-2 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            )}
            {modo === "crear" && codigoListo && (
              <button
                type="button"
                onClick={() => {
                  setCodigoInvitacion("");
                  setCodigoListo(false);
                  setError(null);
                }}
                className="text-sm text-slate-500 underline underline-offset-2 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              >
                Cambiar código de invitación
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setModo(modo === "entrar" ? "crear" : "entrar");
                setContrasena("");
                setContrasenaConfirmar("");
                setCodigoInvitacion("");
                setCodigoListo(false);
                setError(null);
              }}
              className="text-sm text-slate-500 underline underline-offset-2 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            >
              {modo === "entrar" ? "¿Primera vez? Crea tu cuenta" : "Ya tengo cuenta"}
            </button>
          </form>
        )}
      </Card>
    </main>
  );
}
