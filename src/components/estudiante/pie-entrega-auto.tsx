import Boton from "@/components/ui/button";
import { ErrorText } from "@/components/ui/field";
import AvisoReintento from "@/components/estudiante/aviso-reintento";

export default function PieEntregaAuto({
  error,
  bloqueado,
  cargando,
  puntaje,
  intentos,
  maxIntentos,
  onReintentar,
  textoBoton = "Guardar y revisar",
  guardado = false,
  textoGuardado,
  className,
}: {
  error: string | null;
  bloqueado: boolean;
  cargando: boolean;
  puntaje: number | null;
  intentos: number;
  maxIntentos?: number;
  onReintentar: () => void;
  textoBoton?: string;
  guardado?: boolean;
  textoGuardado?: string;
  className?: string;
}) {
  return (
    <>
      {error && <ErrorText>{error}</ErrorText>}
      {guardado && !bloqueado && textoGuardado && (
        <p role="status" aria-live="polite" className="text-sm text-emerald-600 dark:text-emerald-400">
          {textoGuardado}
        </p>
      )}
      {!bloqueado && (
        <Boton type="submit" cargando={cargando} className={className}>
          {cargando ? "Guardando..." : textoBoton}
        </Boton>
      )}
      {bloqueado && (
        <AvisoReintento
          puntaje={puntaje}
          intentos={intentos}
          maxIntentos={maxIntentos}
          onReintentar={onReintentar}
          cargando={cargando}
        />
      )}
    </>
  );
}
