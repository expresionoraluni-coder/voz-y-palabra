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
import Alert from "@/components/ui/alert";
import Boton from "@/components/ui/button";
import MarcaVozPalabra from "@/components/ui/marca-voz-palabra";

function mensajeErrorIngreso(mensaje: string): string {
  const texto = mensaje.toLowerCase();
  if (texto.includes("demasiados intentos")) return mensaje;
  if (texto.includes("demasiadas solicitudes")) return "Hay muchos intentos desde esta red. Espera unos minutos y vuelve a intentarlo.";
  if (texto.includes("nip debe ser de 4 dígitos")) return "Tu NIP debe tener exactamente 4 números.";
  if (texto.includes("sesión inválida")) return "Tu sesión caducó. Intenta entrar de nuevo.";
  return "No pudimos validar tus datos. Revisa el código, tu nombre y tu NIP.";
}

function mensajeErrorSesion(mensaje: string, status?: number): string {
  const texto = mensaje.toLowerCase();
  if (
    status === 429 ||
    texto.includes("rate limit") ||
    texto.includes("too many requests") ||
    texto.includes("over_request_rate_limit")
  ) {
    return "Hay muchos intentos desde esta red. Espera unos minutos y vuelve a intentarlo.";
  }
  if (texto.includes("captcha")) {
    return "El acceso necesita una verificación del navegador. Recarga la página e inténtalo de nuevo.";
  }
  if (texto.includes("anonymous") && (texto.includes("disabled") || texto.includes("not enabled"))) {
    return "El acceso estudiantil está temporalmente deshabilitado. Avísale a tu profesora.";
  }
  if (texto.includes("network") || texto.includes("fetch") || texto.includes("failed to fetch")) {
    return "No pudimos conectar con el servicio. Revisa tu conexión e inténtalo de nuevo.";
  }
  return "No pudimos iniciar tu sesión. Recarga la página e inténtalo de nuevo.";
}

function esErrorDeSesion(mensaje: string): boolean {
  const texto = mensaje.toLowerCase();
  return [
    "foreign key constraint",
    "jwt",
    "token",
    "sesión inválida",
    "session",
    "not authenticated",
    "unauthorized",
    "no autorizado",
    "pgrst301",
  ].some((fragmento) => texto.includes(fragmento));
}

function pareceCorreo(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

export default function IngresoEstudiante() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nipVisible, setNipVisible] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (cargando) return;
    setError(null);

    // Leemos los campos al enviar, no desde eventos de escritura previos.
    // Esto conserva lo que la persona ya capturó si la hidratación del
    // navegador terminó mientras completaba el formulario.
    const datos = new FormData(e.currentTarget);
    const codigo = String(datos.get("codigo_grupo_estudiante") ?? "").trim().toUpperCase();
    const nombreLimpio = String(datos.get("nombre_completo_estudiante") ?? "").trim().replace(/\s+/g, " ");
    const nip = String(datos.get("nip_estudiante") ?? "").replace(/\D/g, "").slice(0, 4);

    if (codigo.length === 0) {
      setError("Escribe el código de tu grupo tal como te lo compartieron.");
      return;
    }
    if (codigo.length > 64) {
      setError("El código de tu grupo no puede tener más de 64 caracteres.");
      return;
    }
    if (nombreLimpio.length === 0) {
      setError("Escribe tu nombre tal como aparece en la lista del grupo.");
      return;
    }
    if (pareceCorreo(nombreLimpio)) {
      setError("En “Tu nombre completo” aparece un correo. Bórralo y escribe tu nombre y apellidos tal como están en la lista.");
      return;
    }
    if (!/^\d{4}$/.test(nip)) {
      setError("Tu NIP debe tener exactamente 4 números.");
      return;
    }

    setCargando(true);

    const supabase = createClient();

    async function crearSesionAnonima(): Promise<boolean> {
      const { error: authError } = await supabase.auth.signInAnonymously();
      if (authError) {
        setError(mensajeErrorSesion(authError.message, authError.status));
        setCargando(false);
        return false;
      }
      return true;
    }

    // Se valida contra el servidor (no solo lo guardado localmente): si la
    // sesión ya no existe de verdad (por ejemplo, quedó "fantasma" en el
    // navegador), esto lo detecta y crea una sesión nueva. También se exige
    // que la sesión existente sea anónima: si en este navegador quedó
    // abierta la sesión real de una docente (p. ej. una demo en un equipo
    // compartido que no cerró sesión), reusarla ligaría al estudiante con
    // la cuenta de la docente en vez de una identidad propia — heredando
    // sin querer sus permisos. La pertenencia del estudiante no se consulta
    // aquí: el RPC la valida y la vincula de forma atómica después de
    // comprobar los datos. Así un permiso RLS o una sesión pendiente no
    // provoca otra alta anónima y no consume innecesariamente el límite de
    // Supabase.
    const { data: usuario, error: usuarioError } = await supabase.auth.getUser();
    if (usuarioError || !usuario.user || !usuario.user.is_anonymous) {
      if (usuario?.user && !usuario.user.is_anonymous) {
        await supabase.auth.signOut({ scope: "local" });
      }
      if (!(await crearSesionAnonima())) return;
    }

    let { data: resultado, error: rpcError } = await supabase.rpc("ingresar_estudiante", {
      p_codigo: codigo,
      p_nombre: nombreLimpio,
      p_nip: nip,
    });

    // Segundo intento de seguridad: si la sesión resultó inválida justo al
    // usarla, se descarta, se crea una nueva y se reintenta una sola vez.
    if (rpcError && esErrorDeSesion(rpcError.message)) {
      await supabase.auth.signOut({ scope: "local" });
      if (await crearSesionAnonima()) {
        ({ data: resultado, error: rpcError } = await supabase.rpc("ingresar_estudiante", {
          p_codigo: codigo,
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
    <main className="auth-shell flex min-h-dvh flex-1 flex-col items-center justify-start gap-3 px-4 py-4 sm:justify-center sm:gap-2 sm:px-6 sm:py-2">
      <div className="relative z-10 w-full max-w-sm">
        <Link
          href="/ingreso"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-slate-500 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:text-slate-50"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Cambiar perfil
        </Link>
      </div>

      <section className="relative z-10 max-w-sm text-center">
        <div className="mx-auto mb-2 w-fit rounded-full border border-white/75 bg-white/70 px-3 py-1 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
          <MarcaVozPalabra compacta />
        </div>
        <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25 sm:size-12">
          <GraduationCap className="size-5 sm:size-6" aria-hidden="true" />
        </div>
        <h1 className="mt-2 text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-2xl">Entrar como estudiante</h1>
        <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm">Ten a la mano tu nombre, el código de grupo y tu NIP. No necesitas correo ni contraseña.</p>
      </section>

      <Card className="relative z-10 w-full max-w-sm border border-white/80 bg-white/90 p-4 shadow-xl shadow-indigo-950/10 backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/90 sm:p-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field>
            <Label htmlFor="codigo">Código de grupo</Label>
            <Input
              id="codigo"
              required
              maxLength={64}
              placeholder="Ej. 1IM4-2026"
              name="codigo_grupo_estudiante"
              autoComplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
              autoCapitalize="characters"
              spellCheck={false}
              aria-describedby="codigo-ayuda"
            />
            <HelpText id="codigo-ayuda" className="text-xs leading-snug">Escríbelo completo, incluido el guion.</HelpText>
          </Field>
          <Field>
            <Label htmlFor="nombre">Tu nombre completo</Label>
            <Input
              id="nombre"
              required
              maxLength={200}
              placeholder="Ej. GARCIA LOPEZ MARIA"
              name="nombre_completo_estudiante"
              autoComplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
              autoCapitalize="words"
              spellCheck={false}
              aria-describedby="nombre-ayuda"
            />
            <HelpText id="nombre-ayuda" className="text-xs leading-snug">Apellidos y después nombres, tal como aparecen en la lista. Sin abreviaturas.</HelpText>
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
                placeholder="••••"
                name="nip_estudiante"
                autoComplete="off"
                data-1p-ignore="true"
                data-lpignore="true"
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
            <HelpText id="nip-ayuda" className="text-xs leading-snug">Primer ingreso: últimos 4 dígitos de tu boleta. Después crearás uno personal.</HelpText>
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          <Boton type="submit" cargando={cargando} className="w-full">
            {cargando ? "Entrando..." : "Entrar"}
          </Boton>
        </form>
      </Card>

      <div className="relative z-10 w-full max-w-sm">
        <Alert tono="info" titulo="¿Olvidaste tu NIP?">
          <span className="flex items-start gap-1.5 text-xs leading-snug">
            <LifeBuoy className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Pídele a tu profesora que lo reinicie. Te dará un NIP temporal y, al entrar, crearás uno nuevo. No lo compartas en el chat del grupo.
          </span>
        </Alert>
      </div>

      <p className="relative z-10 flex max-w-sm items-center gap-1.5 text-center text-xs text-slate-500 dark:text-slate-400">
        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        No necesitas correo ni contraseña para entrar como estudiante.
      </p>
    </main>
  );
}
