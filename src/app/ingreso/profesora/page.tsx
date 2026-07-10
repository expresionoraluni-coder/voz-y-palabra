"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { asegurarPerfilDocente } from "@/lib/supabase/asegurar-perfil-docente";

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
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 dark:bg-black">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {modo === "entrar" ? "Iniciar sesión" : "Crear cuenta de profesora"}
      </h1>
      {avisoConfirmacion ? (
        <p className="max-w-sm text-center text-zinc-700 dark:text-zinc-300">
          Te enviamos un correo a <strong>{correo}</strong> para confirmar tu cuenta.
          Ábrelo y luego vuelve aquí a iniciar sesión.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
          {modo === "crear" && (
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">Nombre</label>
              <input
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600 dark:text-zinc-400">Correo</label>
            <input
              required
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-zinc-600 dark:text-zinc-400">Contraseña</label>
            <input
              required
              type="password"
              minLength={6}
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={cargando}
            className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {cargando ? "Un momento..." : modo === "entrar" ? "Entrar" : "Crear cuenta"}
          </button>
          <button
            type="button"
            onClick={() => setModo(modo === "entrar" ? "crear" : "entrar")}
            className="text-sm text-zinc-500 underline dark:text-zinc-400"
          >
            {modo === "entrar" ? "¿Primera vez? Crea tu cuenta" : "Ya tengo cuenta"}
          </button>
        </form>
      )}
    </div>
  );
}
