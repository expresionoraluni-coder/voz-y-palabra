"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserRound, ArrowLeft, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { asegurarPerfilDocente } from "@/lib/supabase/asegurar-perfil-docente";
import { Card } from "@/components/ui/card";
import { Field, Label, Input, ErrorText } from "@/components/ui/field";
import Boton from "@/components/ui/button";

export default function IngresoProfesora() {
  const router = useRouter();
  const [modo, setModo] = useState<"entrar" | "crear">("entrar");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avisoConfirmacion, setAvisoConfirmacion] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAvisoConfirmacion(false);
    setCargando(true);

    const supabase = createClient();

    if (modo === "entrar") {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: correo,
        password: contrasena,
      });
      if (authError || !data.user) {
        setError("Correo o contraseña incorrectos.");
        setCargando(false);
        return;
      }
      const { error: perfilError } = await asegurarPerfilDocente(supabase, data.user);
      if (perfilError) {
        setError(perfilError.message);
        setCargando(false);
        return;
      }
    } else {
      const { data, error: authError } = await supabase.auth.signUp({
        email: correo,
        password: contrasena,
        options: { data: { nombre } },
      });
      if (authError || !data.user) {
        setError(authError?.message ?? "No pudimos crear tu cuenta.");
        setCargando(false);
        return;
      }

      if (!data.session) {
        setAvisoConfirmacion(true);
        setCargando(false);
        return;
      }

      const { error: perfilError } = await asegurarPerfilDocente(supabase, data.user);
      if (perfilError) {
        setError(perfilError.message);
        setCargando(false);
        return;
      }
    }

    router.push("/docente/dashboard");
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
              <Field>
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </Field>
            )}
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
                minLength={6}
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                autoComplete={modo === "entrar" ? "current-password" : "new-password"}
              />
            </Field>
            {error && <ErrorText>{error}</ErrorText>}
            <Boton type="submit" cargando={cargando} className="w-full">
              {cargando ? "Un momento..." : modo === "entrar" ? "Entrar" : "Crear cuenta"}
            </Boton>
            <button
              type="button"
              onClick={() => setModo(modo === "entrar" ? "crear" : "entrar")}
              className="text-sm text-slate-500 underline underline-offset-2 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            >
              {modo === "entrar" ? "¿Primera vez? Crea tu cuenta" : "Ya tengo cuenta"}
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
